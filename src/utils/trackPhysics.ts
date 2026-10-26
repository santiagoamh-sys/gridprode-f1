/**
 * Motor de físicas de F1 basado en la curvatura del trazado SVG (Curvature-based speed).
 * 
 * Evalúa dinámicamente el trazado oficial de cualquier circuito del calendario calculando:
 * 1. La variación del vector tangente / derivada angular a lo largo del recorrido.
 * 2. Velocidad de paso por curva: disminuye automáticamente en sectores de alta curvatura (horquillas, chicanes, eses).
 * 3. Aceleración gradual: aumenta paulatinamente la velocidad en rectas hasta alcanzar la velocidad punta (top speed).
 * 4. Dinámica longitudinal F1: frenado anticipado antes de entrar a cada curva y tracción progresiva a la salida.
 * 5. Total independencia de los APEX: la velocidad depende exclusivamente de la topografía del SVG.
 */

export interface CurvatureSpeedProfile {
  totalLength: number;
  lapDurationMs: number;
  sampleCount: number;
  progress: number[];
  timeMs: number[];
  speeds: number[];
  curvatures: number[];
}

/**
 * Calcula la diferencia angular mínima entre dos ángulos en radianes en el rango [-PI, PI].
 */
export function angleDiff(targetAngle: number, sourceAngle: number): number {
  return Math.atan2(
    Math.sin(targetAngle - sourceAngle),
    Math.cos(targetAngle - sourceAngle)
  );
}

/**
 * Evalúa dinámicamente el SVGPathElement activo y genera un perfil continuo de velocidad
 * y tiempos de llegada basado en la curvatura de la pista.
 *
 * @param pathEl Elemento SVGPathElement nativo del DOM.
 * @param lapDurationMs Duración exacta de la vuelta completa en milisegundos (ej. 10000ms).
 * @param sampleCount Cantidad de muestras a lo largo del circuito (por defecto 600).
 */
export function computeCurvatureSpeedProfile(
  pathEl: SVGPathElement,
  lapDurationMs: number = 10000,
  sampleCount: number = 600
): CurvatureSpeedProfile {
  const totalLength = pathEl.getTotalLength();
  if (!totalLength || totalLength <= 0) {
    return {
      totalLength: 0,
      lapDurationMs,
      sampleCount: 1,
      progress: [0, 1],
      timeMs: [0, lapDurationMs],
      speeds: [1, 1],
      curvatures: [0, 0],
    };
  }

  const N = Math.max(200, Math.min(1000, sampleCount));
  const stepLen = totalLength / N;
  const delta = Math.max(0.75, Math.min(3.0, stepLen * 0.4));

  // 1. Muestrear posiciones y ángulos de los vectores tangentes
  const angles: number[] = new Array(N);
  for (let i = 0; i < N; i++) {
    const s = i * stepLen;
    const sPrev = (s - delta + totalLength) % totalLength;
    const sNext = (s + delta) % totalLength;
    const ptPrev = pathEl.getPointAtLength(sPrev);
    const ptNext = pathEl.getPointAtLength(sNext);

    const dx = ptNext.x - ptPrev.x;
    const dy = ptNext.y - ptPrev.y;
    angles[i] = Math.atan2(dy, dx);
  }

  // 2. Calcular la tasa de cambio angular (curvatura local |dθ| / ds)
  const rawCurvatures: number[] = new Array(N);
  for (let i = 0; i < N; i++) {
    const nextIdx = (i + 1) % N;
    const dTheta = Math.abs(angleDiff(angles[nextIdx], angles[i]));
    rawCurvatures[i] = dTheta / stepLen;
  }

  // 3. Suavizado gaussiano de 5 puntos con wrap-around para eliminar ruido de discretización
  const smoothCurvatures: number[] = new Array(N);
  let maxCurvature = 0;
  for (let i = 0; i < N; i++) {
    const im2 = (i - 2 + N) % N;
    const im1 = (i - 1 + N) % N;
    const ip1 = (i + 1) % N;
    const ip2 = (i + 2) % N;
    const avg =
      (rawCurvatures[im2] +
        2 * rawCurvatures[im1] +
        3 * rawCurvatures[i] +
        2 * rawCurvatures[ip1] +
        rawCurvatures[ip2]) /
      9;
    smoothCurvatures[i] = avg;
    if (avg > maxCurvature) {
      maxCurvature = avg;
    }
  }

  // 4. Velocidad límite de paso por curva según curvatura
  // En rectas (curvatura ~ 0) -> velocidad máxima 1.0
  // En curvas pronunciadas -> velocidad reducida hasta V_MIN
  const V_MIN = 0.22; // Velocidad mínima en horquillas y curvas lentas
  const V_MAX = 1.0;  // Velocidad punta en rectas principales
  const targetSpeeds: number[] = new Array(N);

  for (let i = 0; i < N; i++) {
    const normCurvature =
      maxCurvature > 0 ? smoothCurvatures[i] / maxCurvature : 0;
    // Función de respuesta con decaimiento sigmoide
    const factor = 1 / (1 + 7.5 * Math.pow(normCurvature, 1.25));
    targetSpeeds[i] = V_MIN + (V_MAX - V_MIN) * factor;
  }

  // 5. Dinámica longitudinal F1:
  // - Backward pass (Frenada previa): el coche frena en línea recta antes de llegar al vértice.
  // - Forward pass (Tracción progresiva): el coche acelera gradualmente al salir de las curvas.
  const speeds: number[] = [...targetSpeeds];
  const dsNorm = 1 / N;
  const a_brake = 6.0; // Desaceleración en frenada F1 (~5G)
  const a_accel = 2.0; // Aceleración en tracción progresiva F1 (~1.5G)

  for (let pass = 0; pass < 2; pass++) {
    // Backward pass (Braking zones)
    for (let i = N - 1; i >= 0; i--) {
      const nextIdx = (i + 1) % N;
      const maxEntrySpeed = Math.sqrt(
        speeds[nextIdx] * speeds[nextIdx] + 2 * a_brake * dsNorm
      );
      if (speeds[i] > maxEntrySpeed) {
        speeds[i] = maxEntrySpeed;
      }
    }
    // Forward pass (Traction acceleration)
    for (let i = 0; i < N; i++) {
      const prevIdx = (i - 1 + N) % N;
      const maxExitSpeed = Math.sqrt(
        speeds[prevIdx] * speeds[prevIdx] + 2 * a_accel * dsNorm
      );
      if (speeds[i] > maxExitSpeed) {
        speeds[i] = maxExitSpeed;
      }
    }
  }

  // 6. Integración numérica del tiempo a lo largo del circuito
  const timeMsArray: number[] = new Array(N + 1);
  const progressArray: number[] = new Array(N + 1);
  const speedsResult: number[] = new Array(N + 1);
  const curvaturesResult: number[] = new Array(N + 1);

  timeMsArray[0] = 0;
  progressArray[0] = 0;
  speedsResult[0] = speeds[0];
  curvaturesResult[0] = smoothCurvatures[0];

  let rawTotalTime = 0;
  for (let i = 0; i < N; i++) {
    const nextIdx = (i + 1) % N;
    const avgSpeed = (speeds[i] + speeds[nextIdx]) / 2;
    const dt = dsNorm / Math.max(0.05, avgSpeed);
    rawTotalTime += dt;

    timeMsArray[i + 1] = rawTotalTime;
    progressArray[i + 1] = (i + 1) / N;
    speedsResult[i + 1] = speeds[nextIdx];
    curvaturesResult[i + 1] = smoothCurvatures[nextIdx];
  }

  // 7. Normalizar el tiempo acumulado exactamente a lapDurationMs
  const scale = rawTotalTime > 0 ? lapDurationMs / rawTotalTime : 1;
  for (let i = 0; i <= N; i++) {
    timeMsArray[i] = timeMsArray[i] * scale;
  }
  timeMsArray[N] = lapDurationMs;
  progressArray[N] = 1.0;

  return {
    totalLength,
    lapDurationMs,
    sampleCount: N,
    progress: progressArray,
    timeMs: timeMsArray,
    speeds: speedsResult,
    curvatures: curvaturesResult,
  };
}

/**
 * Obtiene el progreso exacto (0..1) a lo largo del circuito para un tiempo transcurrido (ms).
 * Utiliza búsqueda binaria rápida e interpolación lineal (complejidad O(log N)).
 */
export function getProgressFromTime(
  profile: CurvatureSpeedProfile,
  elapsedMs: number
): number {
  if (elapsedMs <= 0) return 0;
  if (elapsedMs >= profile.lapDurationMs) return 1;

  const times = profile.timeMs;
  const N = profile.sampleCount;

  let low = 0;
  let high = N;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (times[mid] <= elapsedMs) {
      if (mid === N || times[mid + 1] > elapsedMs) {
        const t0 = times[mid];
        const t1 = times[mid + 1];
        const dt = t1 - t0;
        const u = dt > 0 ? (elapsedMs - t0) / dt : 0;
        const p0 = profile.progress[mid];
        const p1 = profile.progress[mid + 1];
        return p0 + u * (p1 - p0);
      }
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return Math.min(1, Math.max(0, elapsedMs / profile.lapDurationMs));
}

/**
 * Obtiene el tiempo exacto en milisegundos en el que el móvil alcanza un progreso dado (0..1).
 * Permite calibrar el idealTimeMs de cada APEX con precisión sub-píxel y total coherencia física.
 */
export function getTimeFromProgress(
  profile: CurvatureSpeedProfile,
  progress: number
): number {
  if (progress <= 0) return 0;
  if (progress >= 1) return profile.lapDurationMs;

  const N = profile.sampleCount;
  const idx = Math.min(N - 1, Math.max(0, Math.floor(progress * N)));
  const p0 = profile.progress[idx];
  const p1 = profile.progress[idx + 1];
  const dp = p1 - p0;
  const u = dp > 0 ? (progress - p0) / dp : 0;

  const t0 = profile.timeMs[idx];
  const t1 = profile.timeMs[idx + 1];
  return Math.round(t0 + u * (t1 - t0));
}
