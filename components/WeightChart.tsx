import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Line, Circle, Polyline, Text as SvgText, Defs, LinearGradient, Stop } from "react-native-svg";
import { WeightLog } from "../types";
import { WHO_WEIGHT, interpolateWho } from "../utils/whoData";

interface WeightChartProps {
  logs: WeightLog[];
  birthDate: string;
  sex: "m" | "f";
  width: number;
}

const CHART_HEIGHT = 200;
const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;

export default function WeightChart({ logs, birthDate, sex, width }: WeightChartProps) {
  const chartW = width - PAD_LEFT - PAD_RIGHT;
  const chartH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  // Age in months for each log
  const logsWithAge = logs.map((l) => {
    const ageMs = new Date(l.measuredAt).getTime() - new Date(birthDate).getTime();
    const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.44);
    return { ...l, ageMonths };
  });

  // X range: 0 to max(24, latest log + 1 month)
  const maxAge = Math.max(24, ...logsWithAge.map((l) => l.ageMonths + 1));
  const xMax = Math.min(maxAge, 24);

  // Y range: derive from WHO p3 and p97
  const curve = WHO_WEIGHT[sex];
  const yMin = Math.max(0, interpolateWho(curve.p3, 0) - 300);
  const yMax = interpolateWho(curve.p97, xMax) + 300;

  function xScale(months: number) {
    return PAD_LEFT + (months / xMax) * chartW;
  }
  function yScale(grams: number) {
    return PAD_TOP + chartH - ((grams - yMin) / (yMax - yMin)) * chartH;
  }

  // Build WHO band paths
  function buildPath(points: { ageMonths: number; grams: number }[]): string {
    const filtered = points.filter((p) => p.ageMonths <= xMax);
    return filtered
      .map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.ageMonths).toFixed(1)},${yScale(p.grams).toFixed(1)}`)
      .join(" ");
  }

  // Build filled band between two curves (p3 and p97)
  function buildBand(lower: { ageMonths: number; grams: number }[], upper: { ageMonths: number; grams: number }[]): string {
    const filteredLower = lower.filter((p) => p.ageMonths <= xMax);
    const filteredUpper = upper.filter((p) => p.ageMonths <= xMax).reverse();
    const forward = filteredLower.map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.ageMonths).toFixed(1)},${yScale(p.grams).toFixed(1)}`).join(" ");
    const back = filteredUpper.map((p) => `L${xScale(p.ageMonths).toFixed(1)},${yScale(p.grams).toFixed(1)}`).join(" ");
    return `${forward} ${back} Z`;
  }

  // Baby's weight polyline
  const babyPoints = logsWithAge
    .filter((l) => l.ageMonths <= xMax)
    .map((l) => `${xScale(l.ageMonths).toFixed(1)},${yScale(l.weightGrams).toFixed(1)}`)
    .join(" ");

  // X-axis labels: 0, 3, 6, 9, 12, 18, 24 months
  const xLabels = [0, 3, 6, 9, 12, 18, 24].filter((m) => m <= xMax);

  // Y-axis labels: every ~2kg
  const yStep = (yMax - yMin) > 8000 ? 3000 : 2000;
  const yLabels: number[] = [];
  for (let g = Math.ceil(yMin / yStep) * yStep; g <= yMax; g += yStep) {
    yLabels.push(g);
  }

  const accentColor = sex === "m" ? "#7B9EC8" : "#D4856A";

  return (
    <View>
      <Svg width={width} height={CHART_HEIGHT}>
        <Defs>
          <LinearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#4A7C6F" stopOpacity="0.08" />
            <Stop offset="1" stopColor="#4A7C6F" stopOpacity="0.03" />
          </LinearGradient>
          <LinearGradient id="midGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#4A7C6F" stopOpacity="0.12" />
            <Stop offset="1" stopColor="#4A7C6F" stopOpacity="0.06" />
          </LinearGradient>
        </Defs>

        {/* P3–P97 outer band */}
        <Path d={buildBand(curve.p3, curve.p97)} fill="url(#bandGrad)" />
        {/* P15–P85 inner band */}
        <Path d={buildBand(curve.p15, curve.p85)} fill="url(#midGrad)" />

        {/* P3 and P97 border lines */}
        <Path d={buildPath(curve.p3)} fill="none" stroke="#4A7C6F" strokeWidth="1" strokeOpacity="0.3" />
        <Path d={buildPath(curve.p97)} fill="none" stroke="#4A7C6F" strokeWidth="1" strokeOpacity="0.3" />

        {/* P50 median dashed */}
        <Path
          d={buildPath(curve.p50)}
          fill="none"
          stroke="#4A7C6F"
          strokeWidth="1.5"
          strokeOpacity="0.5"
          strokeDasharray="4,4"
        />

        {/* X-axis gridlines + labels */}
        {xLabels.map((m) => (
          <Line
            key={`xg-${m}`}
            x1={xScale(m)}
            y1={PAD_TOP}
            x2={xScale(m)}
            y2={PAD_TOP + chartH}
            stroke="#E5DDD5"
            strokeWidth="1"
          />
        ))}
        {xLabels.map((m) => (
          <SvgText
            key={`xl-${m}`}
            x={xScale(m)}
            y={PAD_TOP + chartH + 16}
            fontSize="10"
            fill="#B0A89A"
            textAnchor="middle"
          >
            {m}M
          </SvgText>
        ))}

        {/* Y-axis labels */}
        {yLabels.map((g) => (
          <SvgText
            key={`yl-${g}`}
            x={PAD_LEFT - 6}
            y={yScale(g) + 4}
            fontSize="10"
            fill="#B0A89A"
            textAnchor="end"
          >
            {(g / 1000).toFixed(1)}
          </SvgText>
        ))}

        {/* P3 / P50 / P97 right-edge labels */}
        <SvgText x={width - PAD_RIGHT + 2} y={yScale(interpolateWho(curve.p3, xMax)) + 4} fontSize="9" fill="#4A7C6F" fillOpacity="0.6">P3</SvgText>
        <SvgText x={width - PAD_RIGHT + 2} y={yScale(interpolateWho(curve.p50, xMax)) + 4} fontSize="9" fill="#4A7C6F" fillOpacity="0.8">P50</SvgText>
        <SvgText x={width - PAD_RIGHT + 2} y={yScale(interpolateWho(curve.p97, xMax)) + 4} fontSize="9" fill="#4A7C6F" fillOpacity="0.6">P97</SvgText>

        {/* Baby's weight line */}
        {logsWithAge.length > 1 && (
          <Polyline
            points={babyPoints}
            fill="none"
            stroke={accentColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data point circles */}
        {logsWithAge
          .filter((l) => l.ageMonths <= xMax)
          .map((l) => (
            <Circle
              key={l.id}
              cx={xScale(l.ageMonths)}
              cy={yScale(l.weightGrams)}
              r={5}
              fill="white"
              stroke={accentColor}
              strokeWidth="2.5"
            />
          ))}
      </Svg>

      {/* Legende */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: accentColor }]} />
          <Text style={styles.legendText}>{sex === "m" ? "Junge" : "Mädchen"} Gewicht</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: "#4A7C6F", opacity: 0.4 }]} />
          <Text style={styles.legendText}>WHO P3–P97</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: PAD_LEFT,
    marginTop: 4,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendLine: { width: 20, height: 2.5, borderRadius: 2 },
  legendText: { fontSize: 11, color: "#7A7269" },
});
