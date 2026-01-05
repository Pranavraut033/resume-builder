/**
 * Token Breakdown Charts Component
 * Displays token usage breakdown by provider or model using bar charts
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { TokenUsageByProvider, TokenUsageByModel } from "@/actions/tokenUsage";

interface TokenBreakdownChartsProps {
  data: TokenUsageByProvider[] | TokenUsageByModel[];
  type: "provider" | "model";
}

export default function TokenBreakdownCharts({
  data,
  type,
}: TokenBreakdownChartsProps) {
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-gray-500 dark:text-gray-400">
        <p>No {type} data available yet.</p>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Prepare data for display
  const chartData = data.map((item) => {
    const label =
      type === "provider"
        ? (item as TokenUsageByProvider).provider
        : `${(item as TokenUsageByModel).model.substring(0, 20)}...`;

    return {
      name: label,
      fullName: type === "model" ? (item as TokenUsageByModel).model : label,
      inputTokens: item.inputTokens,
      outputTokens: item.outputTokens,
      totalTokens: item.totalTokens,
      requests: item.requestCount,
    };
  });

  // Sort by total tokens descending
  chartData.sort((a, b) => b.totalTokens - a.totalTokens);

  // Take top 10 if showing models
  const displayData = type === "model" ? chartData.slice(0, 10) : chartData;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={displayData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="name"
          stroke="#6b7280"
          style={{ fontSize: "12px", fill: "#6b7280" }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          stroke="#6b7280"
          style={{ fontSize: "12px", fill: "#6b7280" }}
          tickFormatter={formatNumber}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
          labelStyle={{ color: "#111827", fontWeight: 600 }}
          formatter={(value: number | undefined) =>
            value?.toLocaleString() || "0"
          }
          labelFormatter={(label) => {
            const item = displayData.find((d) => d.name === label);
            return item?.fullName || label;
          }}
        />
        <Legend wrapperStyle={{ paddingTop: "20px" }} />
        <Bar
          dataKey="inputTokens"
          fill="#3b82f6"
          name="Input Tokens"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="outputTokens"
          fill="#8b5cf6"
          name="Output Tokens"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
