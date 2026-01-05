/**
 * Token Time Series Chart Component
 * Displays token usage over time using a line chart
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { TokenUsageByDay } from "@/actions/tokenUsage";

interface TokenTimeSeriesChartProps {
  data: TokenUsageByDay[];
}

export default function TokenTimeSeriesChart({
  data,
}: TokenTimeSeriesChartProps) {
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center text-gray-500 dark:text-gray-400">
        <p>
          No time-series data available. Start using LLM features to see trends.
        </p>
      </div>
    );
  }

  // Format date for display
  const formattedData = data.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          style={{ fontSize: "12px", fill: "#6b7280" }}
        />
        <YAxis stroke="#6b7280" style={{ fontSize: "12px", fill: "#6b7280" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
          labelStyle={{ color: "#111827", fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="line" />
        <Line
          type="monotone"
          dataKey="inputTokens"
          stroke="#3b82f6"
          strokeWidth={2}
          name="Input Tokens"
          dot={{ r: 4, fill: "#3b82f6" }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="outputTokens"
          stroke="#8b5cf6"
          strokeWidth={2}
          name="Output Tokens"
          dot={{ r: 4, fill: "#8b5cf6" }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="totalTokens"
          stroke="#10b981"
          strokeWidth={2}
          name="Total Tokens"
          dot={{ r: 4, fill: "#10b981" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
