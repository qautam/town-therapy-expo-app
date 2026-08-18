import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

/** Broad-crowned Sal / Saal (Shorea robusta). */
function SaalTree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const w = 24 * scale;
  const h = 42 * scale;
  return (
    <G transform={`translate(${x}, ${y})`}>
      <Ellipse cx={0} cy={3} rx={w * 0.4} ry={h * 0.05} fill="#1A2F2F" opacity={0.28} />
      <Path
        d={`M ${-w * 0.09} 0
            C ${-w * 0.11} ${-h * 0.2}, ${-w * 0.07} ${-h * 0.34}, ${-w * 0.04} ${-h * 0.42}
            L ${w * 0.05} ${-h * 0.42}
            C ${w * 0.09} ${-h * 0.34}, ${w * 0.11} ${-h * 0.2}, ${w * 0.08} 0 Z`}
        fill="#5C4030"
      />
      <Path
        d={`M ${-w * 0.02} ${-h * 0.06} C ${-w * 0.03} ${-h * 0.22}, 0 ${-h * 0.32}, ${w * 0.01} ${-h * 0.4}`}
        stroke="#7A5638"
        strokeWidth={Math.max(1, 1.1 * scale)}
        fill="none"
        opacity={0.5}
      />
      <Ellipse cx={0} cy={-h * 0.5} rx={w * 0.58} ry={h * 0.3} fill="#2A5248" />
      <Ellipse cx={-w * 0.3} cy={-h * 0.6} rx={w * 0.42} ry={h * 0.27} fill="#356B5A" />
      <Ellipse cx={w * 0.28} cy={-h * 0.58} rx={w * 0.4} ry={h * 0.25} fill="#2F6152" />
      <Ellipse cx={0} cy={-h * 0.74} rx={w * 0.38} ry={h * 0.23} fill="#3F7D68" />
      <Ellipse cx={-w * 0.1} cy={-h * 0.66} rx={w * 0.22} ry={h * 0.14} fill="#5A9A7E" opacity={0.75} />
      <Ellipse cx={w * 0.12} cy={-h * 0.64} rx={w * 0.18} ry={h * 0.12} fill="#4A8A70" opacity={0.65} />
    </G>
  );
}

/** Tall conical Deodar / Devdaar (Cedrus deodara). */
function DeodarTree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const w = 17 * scale;
  const h = 52 * scale;
  return (
    <G transform={`translate(${x}, ${y})`}>
      <Ellipse cx={0} cy={3} rx={w * 0.3} ry={h * 0.04} fill="#1A2F2F" opacity={0.25} />
      <Rect x={-w * 0.07} y={-h * 0.24} width={w * 0.14} height={h * 0.26} rx={1.5} fill="#3E2E22" />
      <Path
        d={`M 0 ${-h * 0.92} L ${w * 0.2} ${-h * 0.72} L ${-w * 0.2} ${-h * 0.72} Z`}
        fill="#1E433C"
      />
      <Path
        d={`M 0 ${-h * 0.82} L ${w * 0.3} ${-h * 0.56} L ${-w * 0.3} ${-h * 0.56} Z`}
        fill="#255248"
      />
      <Path
        d={`M 0 ${-h * 0.66} L ${w * 0.38} ${-h * 0.38} L ${-w * 0.38} ${-h * 0.38} Z`}
        fill="#2D5F54"
      />
      <Path
        d={`M 0 ${-h * 0.5} L ${w * 0.46} ${-h * 0.2} L ${-w * 0.46} ${-h * 0.2} Z`}
        fill="#234A42"
      />
      <Path
        d={`M 0 ${-h * 0.86} L ${w * 0.12} ${-h * 0.7} L ${w * 0.02} ${-h * 0.7} Z`}
        fill="#3F7A68"
        opacity={0.5}
      />
      <Path
        d={`M 0 ${-h * 0.72} L ${w * 0.18} ${-h * 0.54} L ${w * 0.03} ${-h * 0.54} Z`}
        fill="#3F7A68"
        opacity={0.38}
      />
    </G>
  );
}

/**
 * Static painted Hazaribagh landscape in Town Therapy greens —
 * saal groves, deodar spires, hills, and still lakes.
 */
export function SplashLandscape() {
  const { width, height } = useWindowDimensions();
  const vbW = 390;
  const vbH = 844;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0.15" y2="1">
            <Stop offset="0%" stopColor="#4A7373" />
            <Stop offset="32%" stopColor="#6A9494" />
            <Stop offset="62%" stopColor="#A8C4C0" />
            <Stop offset="100%" stopColor="#E2D6B8" />
          </LinearGradient>
          <LinearGradient id="skyWash" x1="1" y1="0" x2="0" y2="0.85">
            <Stop offset="0%" stopColor="#7ADEDD" stopOpacity="0.22" />
            <Stop offset="45%" stopColor="#3A6565" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#2D4F4F" stopOpacity="0.18" />
          </LinearGradient>
          <RadialGradient id="sun" cx="76%" cy="15%" r="26%">
            <Stop offset="0%" stopColor="#FFF6D0" stopOpacity="0.95" />
            <Stop offset="38%" stopColor="#E8C97A" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#E8C97A" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="farHill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#5A8580" />
            <Stop offset="100%" stopColor="#3A6565" />
          </LinearGradient>
          <LinearGradient id="midHill" x1="0" y1="0" x2="0.2" y2="1">
            <Stop offset="0%" stopColor="#3A6565" />
            <Stop offset="100%" stopColor="#2D4F4F" />
          </LinearGradient>
          <LinearGradient id="nearHill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#2D4F4F" />
            <Stop offset="50%" stopColor="#243F3F" />
            <Stop offset="100%" stopColor="#1A2F2F" />
          </LinearGradient>
          <LinearGradient id="lake" x1="0" y1="0" x2="0.35" y2="1">
            <Stop offset="0%" stopColor="#7ADEDD" />
            <Stop offset="40%" stopColor="#4A9A9A" />
            <Stop offset="100%" stopColor="#2D5F5F" />
          </LinearGradient>
          <LinearGradient id="lake2" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#8AE8E0" />
            <Stop offset="50%" stopColor="#4AB0A8" />
            <Stop offset="100%" stopColor="#2D6A62" />
          </LinearGradient>
          <LinearGradient id="meadow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#4A7870" />
            <Stop offset="100%" stopColor="#2D4F4F" />
          </LinearGradient>
          <RadialGradient id="vignette" cx="50%" cy="42%" r="72%">
            <Stop offset="50%" stopColor="#000000" stopOpacity="0" />
            <Stop offset="100%" stopColor="#122222" stopOpacity="0.35" />
          </RadialGradient>
        </Defs>

        <Rect x={0} y={0} width={vbW} height={vbH} fill="url(#sky)" />
        <Rect x={0} y={0} width={vbW} height={vbH} fill="url(#skyWash)" />

        {/* Golden hour sun */}
        <Circle cx={298} cy={118} r={125} fill="url(#sun)" />
        <Circle cx={298} cy={118} r={30} fill="#FFF3B8" opacity={0.92} />
        <Circle cx={298} cy={118} r={14} fill="#FFFFFF" opacity={0.5} />

        {/* Soft clouds */}
        <Ellipse cx={60} cy={98} rx={46} ry={16} fill="#FFFFFF" opacity={0.38} />
        <Ellipse cx={90} cy={92} rx={30} ry={12} fill="#FFFFFF" opacity={0.32} />
        <Ellipse cx={175} cy={132} rx={38} ry={12} fill="#FFFFFF" opacity={0.24} />
        <Ellipse cx={345} cy={155} rx={32} ry={11} fill="#FFFFFF" opacity={0.2} />

        {/* Rolling hills */}
        <Path
          d="M-20 415 C45 355, 95 345, 155 378 C215 410, 255 338, 315 358 C365 376, 405 348, 435 378 L435 520 L-20 520 Z"
          fill="url(#farHill)"
        />
        <Path
          d="M-40 455 C30 395, 110 385, 170 425 C230 465, 280 395, 340 415 C390 433, 430 405, 460 435 L460 560 L-40 560 Z"
          fill="url(#midHill)"
        />

        {/* Mid lake — still, glassy */}
        <Ellipse cx={208} cy={498} rx={155} ry={44} fill="url(#lake)" />
        <Ellipse cx={188} cy={486} rx={72} ry={10} fill="#FFFFFF" opacity={0.32} />
        <Ellipse cx={250} cy={506} rx={42} ry={6} fill="#C8F4F0" opacity={0.35} />
        <Path
          d="M135 496 Q185 488 235 498"
          stroke="#FFFFFF"
          strokeWidth={1.3}
          opacity={0.22}
          fill="none"
        />
        <Path
          d="M160 508 Q210 502 255 510"
          stroke="#7ADEDD"
          strokeWidth={1}
          opacity={0.35}
          fill="none"
        />

        {/* Near hills framing water */}
        <Path
          d="M-30 535 C50 485, 120 495, 180 540 C210 560, 250 515, 300 535 C350 555, 400 525, 440 555 L440 900 L-30 900 Z"
          fill="url(#nearHill)"
        />
        <Path
          d="M115 615 C175 575, 235 585, 285 625 C325 655, 365 615, 420 645 L420 900 L115 900 Z"
          fill="#1A3535"
          opacity={0.9}
        />

        {/* Foreground lakes */}
        <Ellipse cx={92} cy={698} rx={100} ry={38} fill="url(#lake2)" />
        <Ellipse cx={76} cy={688} rx={44} ry={8} fill="#FFFFFF" opacity={0.3} />
        <Ellipse cx={305} cy={738} rx={74} ry={24} fill="url(#lake)" />
        <Ellipse cx={292} cy={732} rx={28} ry={5} fill="#C8F4F0" opacity={0.38} />

        <Path
          d="M0 638 C60 618, 110 628, 160 648 C200 666, 250 638, 320 653 C360 663, 390 653, 420 668 L420 720 L0 720 Z"
          fill="url(#meadow)"
          opacity={0.78}
        />

        {/* Far ridge — saal + deodar silhouette line */}
        <DeodarTree x={22} y={395} scale={0.7} />
        <SaalTree x={52} y={400} scale={0.72} />
        <DeodarTree x={84} y={388} scale={0.82} />
        <SaalTree x={116} y={398} scale={0.65} />
        <DeodarTree x={148} y={382} scale={0.9} />
        <SaalTree x={182} y={394} scale={0.75} />
        <DeodarTree x={216} y={380} scale={0.72} />
        <SaalTree x={250} y={396} scale={0.7} />
        <DeodarTree x={284} y={386} scale={0.95} />
        <SaalTree x={320} y={398} scale={0.68} />
        <DeodarTree x={352} y={384} scale={0.78} />
        <SaalTree x={378} y={400} scale={0.6} />

        {/* Lakeside band */}
        <SaalTree x={32} y={472} scale={1.1} />
        <DeodarTree x={70} y={462} scale={1.25} />
        <SaalTree x={110} y={478} scale={1.0} />
        <DeodarTree x={148} y={468} scale={0.85} />
        <DeodarTree x={318} y={465} scale={1.3} />
        <SaalTree x={358} y={482} scale={0.95} />
        <DeodarTree x={385} y={460} scale={1.1} />

        {/* Mid fillers */}
        <DeodarTree x={95} y={548} scale={0.58} />
        <SaalTree x={128} y={558} scale={0.52} />
        <DeodarTree x={265} y={542} scale={0.62} />
        <SaalTree x={300} y={555} scale={0.55} />
        <DeodarTree x={40} y={555} scale={0.55} />
        <SaalTree x={360} y={548} scale={0.5} />

        {/* Foreground grove — majestic */}
        <DeodarTree x={12} y={612} scale={1.55} />
        <SaalTree x={52} y={638} scale={1.35} />
        <DeodarTree x={135} y={600} scale={1.7} />
        <SaalTree x={182} y={632} scale={1.25} />
        <DeodarTree x={245} y={595} scale={1.8} />
        <SaalTree x={292} y={628} scale={1.3} />
        <DeodarTree x={340} y={605} scale={1.5} />
        <SaalTree x={375} y={640} scale={1.15} />

        {/* Painterly vignette + grain */}
        <Rect x={0} y={0} width={vbW} height={vbH} fill="url(#vignette)" />
        {Array.from({ length: 32 }).map((_, i) => (
          <Circle
            key={i}
            cx={(i * 97 + 23) % vbW}
            cy={(i * 137 + 41) % vbH}
            r={0.65 + (i % 3) * 0.3}
            fill="#1A2F2F"
            opacity={0.045 + (i % 4) * 0.012}
          />
        ))}
      </Svg>
    </View>
  );
}
