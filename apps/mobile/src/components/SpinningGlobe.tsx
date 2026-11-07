import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Image, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import points from '../../assets/globe/points.json';
import { Globe } from './Globe';

const vertices = new Float32Array(points);
const vertexSource = `
  attribute vec4 a_point;
  uniform float u_angle;
  uniform float u_scale;
  varying float v_depth;
  varying float v_land;
  void main() {
    float c = cos(u_angle), s = sin(u_angle);
    vec3 p = vec3(c * a_point.x + s * a_point.z, a_point.y,
                  -s * a_point.x + c * a_point.z);
    // Preserve the original 15-degree viewing latitude and tilted axis.
    float y = 0.965926 * p.y - 0.258819 * p.z;
    v_depth = 0.258819 * p.y + 0.965926 * p.z;
    vec2 xy = vec2(0.956305 * p.x - 0.292372 * y,
                   0.292372 * p.x + 0.956305 * y);
    gl_Position = vec4(xy * 0.908, 0.0, 1.0);
    v_land = a_point.w;
    gl_PointSize = max(1.0, mix(1.7 + v_depth, 2.9 + 2.1 * v_depth, v_land) * u_scale);
  }
`;
const fragmentSource = `
  precision mediump float;
  varying float v_depth;
  varying float v_land;
  void main() {
    float r = length(gl_PointCoord - vec2(0.5));
    if (v_depth < 0.0 || r > 0.5) discard;
    vec3 color = mix(vec3(0.333, 0.349, 0.384), vec3(1.0), v_land);
    float alpha = mix(0.13 + 0.15 * v_depth, 0.48 + 0.5 * v_depth, v_land);
    gl_FragColor = vec4(color, alpha * (1.0 - smoothstep(0.35, 0.5, r)));
  }
`;

function GlobeSurface() {
  const cleanup = useRef<(() => void) | null>(null);
  const mounted = useRef(true);
  const [failed, setFailed] = useState(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; cleanup.current?.(); };
  }, []);

  const createContext = (gl: ExpoWebGLRenderingContext) => {
    if (!mounted.current) return;
    cleanup.current?.();
    let frame = 0;
    let stopped = false;
    const shaders: WebGLShader[] = [];
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    const stop = () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(frame);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      shaders.forEach(shader => gl.deleteShader(shader));
    };
    cleanup.current = stop;
    try {
      if (!program || !buffer) throw new Error('Globe graphics resources unavailable.');
      for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]] as const) {
        const shader = gl.createShader(type);
        if (!shader) throw new Error('Globe shader unavailable.');
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Globe shader compilation failed.');
        gl.attachShader(program, shader);
      }
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Globe shader linking failed.');
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
      const point = gl.getAttribLocation(program, 'a_point');
      gl.enableVertexAttribArray(point);
      gl.vertexAttribPointer(point, 4, gl.FLOAT, false, 0, 0);
      const angle = gl.getUniformLocation(program, 'u_angle');
      const scale = gl.getUniformLocation(program, 'u_scale');
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      const started = performance.now();
      const draw = () => {
        if (stopped) return;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.uniform1f(scale, gl.drawingBufferWidth / 1000);
        gl.uniform1f(angle, (performance.now() - started) / 45000 * Math.PI * 2);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, vertices.length / 4);
        gl.flush();
        gl.endFrameEXP();
        frame = requestAnimationFrame(draw);
      };
      draw();
    } catch {
      stop();
      if (mounted.current) setFailed(true);
    }
  };

  if (failed) return <Image source={require('../../assets/globe/dotted-globe.png')} resizeMode="contain" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} />;
  return <>
    <Image source={require('../../assets/globe/sphere.png')} resizeMode="contain" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} />
    <GLView testID="spinning-globe-surface" style={StyleSheet.absoluteFill} onContextCreate={createContext} />
  </>;
}

export function SpinningGlobe({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  const [reduceMotion, setReduceMotion] = useState(true);
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', value => setAppActive(value === 'active'));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (Platform.OS === 'web') {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      const update = () => setReduceMotion(query.matches);
      update();
      query.addEventListener('change', update);
      return () => query.removeEventListener('change', update);
    }
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  return <View testID="login-globe" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ width: size, height: size }, style]}>
    {focused && appActive && !reduceMotion ? <GlobeSurface /> : <Globe size={size} />}
  </View>;
}
