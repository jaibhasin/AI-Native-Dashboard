"use client";

import { createLibrary, defineComponent } from "@openuidev/react-lang";
import {
  Area,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useId, type ReactNode } from "react";
import { z } from "zod/v4";
import {
  chartPointSchema,
  chartSeriesSchema,
  formFieldSchema,
  insightSchema,
  metricSchema,
  tableSchema,
  type ChartPoint,
  type ChartSeries,
  type MetricData,
  type Tone,
} from "@/lib/dashboard-schemas";

const toneClasses: Record<Tone, string> = {
  neutral: "border-[var(--tone-neutral-border)] bg-[var(--tone-neutral-bg)] text-[var(--tone-neutral-text)]",
  positive: "border-[var(--tone-positive-border)] bg-[var(--tone-positive-bg)] text-[var(--tone-positive-text)]",
  negative: "border-[var(--tone-negative-border)] bg-[var(--tone-negative-bg)] text-[var(--tone-negative-text)]",
  warning: "border-[var(--tone-warning-border)] bg-[var(--tone-warning-bg)] text-[var(--tone-warning-text)]",
};

const insightAccent: Record<Tone, string> = {
  neutral: "var(--chart-neutral)",
  positive: "var(--chart-positive)",
  negative: "var(--chart-negative)",
  warning: "var(--chart-warning)",
};

const seriesColors: Record<Tone, string> = {
  neutral: "var(--chart-neutral)",
  positive: "var(--chart-positive)",
  negative: "var(--chart-negative)",
  warning: "var(--chart-warning)",
};

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function safeTone(value: unknown): Tone {
  return value === "positive" || value === "negative" || value === "warning" || value === "neutral"
    ? value
    : "neutral";
}

function safeText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function safeMetric(metric: Partial<MetricData> | null | undefined, index: number): MetricData {
  return {
    delta: safeText(metric?.delta),
    label: safeText(metric?.label) || `Metric ${index + 1}`,
    tone: safeTone(metric?.tone),
    value: safeText(metric?.value),
  };
}

function chartRows(points: ChartPoint[] | null | undefined, series: ChartSeries[] | null | undefined) {
  const safeSeries = asArray(series);

  return asArray(points).map((point, pointIndex) => {
    const values = Array.isArray(point?.values) ? point.values : [];
    const row: Record<string, number | string> = {
      label: safeText(point?.label) || `Point ${pointIndex + 1}`,
    };

    safeSeries.forEach((item, index) => {
      row[`series${index}`] = values[index] ?? 0;
    });

    return row;
  });
}

function chartMoneyUnit(title: string, series: Array<Pick<ChartSeries, "label">>) {
  const labelText = [title, ...series.map((item) => item.label)].join(" ").toLowerCase();

  if (!/(\$|cash|money|revenue|arr|mrr|burn|spend|cost)/.test(labelText)) {
    return null;
  }

  return /\$k|\bk\b|thousand/.test(labelText) ? "thousands" : "absolute";
}

function formatMoneyTick(value: number | string, unit: "absolute" | "thousands") {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return safeText(value);
  }

  if (unit === "thousands") {
    return `$${Math.round(numericValue)}k`;
  }

  if (Math.abs(numericValue) >= 1_000_000) {
    return `$${Math.round(numericValue / 1_000_000)}M`;
  }

  if (Math.abs(numericValue) >= 1_000) {
    return `$${Math.round(numericValue / 1_000)}k`;
  }

  return `$${Math.round(numericValue)}`;
}

function tableCell(row: { cells?: unknown[] } | unknown[] | null | undefined, columnIndex: number) {
  if (Array.isArray(row)) {
    return safeText(row[columnIndex]);
  }

  return safeText(row?.cells?.[columnIndex]);
}

function tableCellTone(column: string, value: string): Tone | null {
  const columnLabel = column.toLowerCase();
  const cellValue = value.toLowerCase();

  if (columnLabel.includes("risk")) {
    if (cellValue === "high") {
      return "negative";
    }

    if (cellValue === "medium") {
      return "warning";
    }

    if (cellValue === "low") {
      return "positive";
    }
  }

  if (columnLabel.includes("status")) {
    if (cellValue.includes("blocked")) {
      return "negative";
    }

    if (cellValue.includes("at risk")) {
      return "warning";
    }

    if (cellValue.includes("on track")) {
      return "positive";
    }
  }

  if (columnLabel.includes("mom") || columnLabel.includes("delta")) {
    if (cellValue.startsWith("+")) {
      return "warning";
    }

    if (cellValue.startsWith("-")) {
      return "positive";
    }
  }

  return null;
}

function TableCellContent({ column, value }: { column: string; value: string }) {
  const tone = tableCellTone(column, value);

  if (!tone) {
    return <>{value}</>;
  }

  return (
    <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${toneClasses[tone]}`}>
      {value}
    </span>
  );
}

function BlockShell({
  children,
  className = "",
  title,
  trailing,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className={`flex min-h-0 flex-col rounded-lg bg-[var(--widget-block-bg)] ${className}`}>
      {title ? (
        <div className="flex shrink-0 items-center justify-between gap-2 px-2 pt-1.5">
          <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {title}
          </div>
          {trailing}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function ChartLegend({ series }: { series: Array<{ label: string; tone: Tone }> }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      {series.map((seriesItem, index) => (
        <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]" key={`${seriesItem.label}-${index}`}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: seriesColors[seriesItem.tone] }} />
          <span className="truncate">{seriesItem.label}</span>
        </div>
      ))}
    </div>
  );
}

const MetricGrid = defineComponent({
  name: "MetricGrid",
  description: "A compact grid of KPI metric cards.",
  props: z.object({
    metrics: z.array(metricSchema),
  }),
  component: ({ props }) => {
    const metrics = asArray(props.metrics).map(safeMetric).slice(0, 4);
    const gridClass = metrics.length === 4 ? "grid-cols-4" : "grid-cols-2";

    return (
      <div className={`grid ${gridClass} gap-1.5`}>
        {metrics.map((metric, index) => (
          <div
            className={`min-w-0 rounded-lg border px-2 py-1.5 shadow-[var(--widget-metric-shadow)] ${toneClasses[metric.tone]}`}
            key={`${metric.label}-${index}`}
          >
            <div className="truncate text-[10px] font-semibold uppercase tracking-wide opacity-80">{metric.label}</div>
            <div className="mt-0.5 truncate text-xl font-bold leading-none tracking-tight text-[var(--text-primary)]">
              {metric.value}
            </div>
            {metric.delta ? <div className="mt-0.5 truncate text-[10px] font-medium opacity-90">{metric.delta}</div> : null}
          </div>
        ))}
      </div>
    );
  },
});

const LineChart = defineComponent({
  name: "LineChart",
  description: "A line chart for trends over time or ordered categories.",
  props: z.object({
    title: z.string(),
    data: z.array(chartPointSchema),
    series: z.array(chartSeriesSchema),
    projectionStartIndex: z.number(),
  }),
  component: ({ props }) => {
    const gradientId = useId().replace(/:/g, "");
    const series = asArray(props.series).map((item, index) => ({
      label: safeText(item?.label) || `Series ${index + 1}`,
      tone: safeTone(item?.tone),
    }));
    const rows = chartRows(props.data, series);
    const moneyUnit = chartMoneyUnit(props.title, series);
    const hasProjection = props.projectionStartIndex >= 0;

    return (
      <BlockShell className="min-h-[168px] flex-1" title={props.title} trailing={<ChartLegend series={series} />}>
        <div className="min-h-[148px] flex-1 px-1 pb-1">
          <ResponsiveContainer height="100%" minHeight={148} width="100%">
            <RechartsLineChart data={rows} margin={{ bottom: 2, left: -8, right: 4, top: 6 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={seriesColors[series[0]?.tone ?? "neutral"]} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={seriesColors[series[0]?.tone ?? "neutral"]} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--widget-chart-grid)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="label"
                interval="preserveStartEnd"
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                tickFormatter={moneyUnit ? (value) => formatMoneyTick(value, moneyUnit) : undefined}
                tickLine={false}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text-primary)",
                  fontSize: 11,
                  padding: "6px 8px",
                }}
                itemStyle={{ color: "var(--text-primary)" }}
                labelStyle={{ color: "var(--text-secondary)", fontSize: 10 }}
              />
              {series.length > 0 ? (
                <Area dataKey="series0" fill={`url(#${gradientId})`} stroke="none" type="monotone" />
              ) : null}
              {series.map((seriesItem, index) => (
                <Line
                  activeDot={{ fill: seriesColors[seriesItem.tone], r: 3, strokeWidth: 0 }}
                  dataKey={`series${index}`}
                  dot={false}
                  key={`${seriesItem.label}-${index}`}
                  name={seriesItem.label}
                  stroke={seriesColors[seriesItem.tone]}
                  strokeDasharray={hasProjection && index === 0 ? "5 4" : undefined}
                  strokeWidth={2.25}
                  type="monotone"
                />
              ))}
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </BlockShell>
    );
  },
});

const BarChart = defineComponent({
  name: "BarChart",
  description: "A bar chart for category or time comparisons.",
  props: z.object({
    title: z.string(),
    data: z.array(chartPointSchema),
    series: z.array(chartSeriesSchema),
  }),
  component: ({ props }) => {
    const gradientId = useId().replace(/:/g, "");
    const series = asArray(props.series).map((item, index) => ({
      label: safeText(item?.label) || `Series ${index + 1}`,
      tone: safeTone(item?.tone),
    }));
    const rows = chartRows(props.data, series);
    const moneyUnit = chartMoneyUnit(props.title, series);
    const barColor = seriesColors[series[0]?.tone ?? "positive"];

    return (
      <BlockShell className="min-h-[168px] flex-1" title={props.title}>
        <div className="min-h-[148px] flex-1 px-1 pb-1">
          <ResponsiveContainer height="100%" minHeight={148} width="100%">
            <RechartsBarChart data={rows} margin={{ bottom: 2, left: -8, right: 4, top: 6 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={barColor} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={barColor} stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--widget-chart-grid)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="label"
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                tickFormatter={moneyUnit ? (value) => formatMoneyTick(value, moneyUnit) : undefined}
                tickLine={false}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text-primary)",
                  fontSize: 11,
                  padding: "6px 8px",
                }}
                itemStyle={{ color: "var(--text-primary)" }}
                labelStyle={{ color: "var(--text-secondary)", fontSize: 10 }}
              />
              {series.map((seriesItem, index) => (
                <Bar
                  dataKey={`series${index}`}
                  fill={`url(#${gradientId})`}
                  key={`${seriesItem.label}-${index}`}
                  name={seriesItem.label}
                  radius={[5, 5, 0, 0]}
                />
              ))}
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </BlockShell>
    );
  },
});

const DataTable = defineComponent({
  name: "DataTable",
  description: "A small data table.",
  props: tableSchema,
  component: ({ props }) => {
    const columns = asArray(props.columns).map(safeText).filter(Boolean);
    const rows = asArray(props.rows).slice(0, 8);

    return (
      <BlockShell className="overflow-hidden" title={props.title || undefined}>
        <div className="overflow-hidden px-1 pb-1">
          <table className="w-full border-collapse text-left text-[11px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                {columns.map((column, index) => (
                  <th className="whitespace-nowrap px-2 py-1 font-semibold" key={`${column}-${index}`}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  className="border-t border-[var(--border-soft)] text-[var(--text-primary)] even:bg-[var(--surface-muted)]/60"
                  key={rowIndex}
                >
                  {columns.map((column, columnIndex) => {
                    const cellValue = tableCell(row, columnIndex);

                    return (
                      <td className="whitespace-nowrap px-2 py-1.5" key={`${column}-${columnIndex}`}>
                        <TableCellContent column={column} value={cellValue} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BlockShell>
    );
  },
});

const InsightList = defineComponent({
  name: "InsightList",
  description: "A short list of generated observations.",
  props: z.object({
    title: z.string(),
    items: z.array(insightSchema),
  }),
  component: ({ props }) => {
    const items = asArray(props.items).slice(0, 4);

    return (
      <BlockShell title={props.title}>
        <div className="space-y-1 px-2 pb-2">
          {items.map((item, index) => {
            const tone = safeTone(item?.tone);

            return (
              <div
                className="flex gap-2 rounded-md bg-[var(--panel)]/70 px-2 py-1.5"
                key={`${safeText(item?.label)}-${index}`}
                style={{ boxShadow: "inset 3px 0 0 " + insightAccent[tone] }}
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold leading-tight text-[var(--text-primary)]">
                    {safeText(item?.label)}
                  </div>
                  <div className="mt-0.5 text-[10px] leading-snug text-[var(--text-muted)]">{safeText(item?.detail)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </BlockShell>
    );
  },
});

const FormPreview = defineComponent({
  name: "FormPreview",
  description: "A non-submitting form layout preview.",
  props: z.object({
    title: z.string(),
    fields: z.array(formFieldSchema),
    submitLabel: z.string(),
  }),
  component: ({ props }) => {
    const fields = asArray(props.fields).slice(0, 4);

    return (
      <BlockShell title={props.title}>
        <div className="grid grid-cols-2 gap-1.5 px-2 pb-2">
          {fields.map((field, index) => (
            <label className="min-w-0 text-[10px] font-medium text-[var(--text-secondary)]" key={`${safeText(field?.label)}-${index}`}>
              <span className="mb-0.5 block truncate">{safeText(field?.label)}</span>
              <input
                className="h-7 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface-muted)] px-2 text-[11px] text-[var(--text-primary)] outline-none"
                disabled
                placeholder={safeText(field?.placeholder)}
                type={field?.type === "number" ? "number" : field?.type === "date" ? "date" : "text"}
              />
            </label>
          ))}
        </div>
        <button
          className="mx-2 mb-2 h-7 rounded-md bg-[var(--primary)] px-3 text-[11px] font-semibold text-[var(--primary-foreground)] opacity-85"
          disabled
          type="button"
        >
          {props.submitLabel}
        </button>
      </BlockShell>
    );
  },
});

const DashboardBlock = z.union([
  MetricGrid.ref,
  LineChart.ref,
  BarChart.ref,
  DataTable.ref,
  InsightList.ref,
  FormPreview.ref,
]);

const DashboardWidget = defineComponent({
  name: "DashboardWidget",
  description:
    "The root container for one canvas dashboard widget. Use this as the root statement.",
  props: z.object({
    title: z.string(),
    subtitle: z.string(),
    dataDisclosure: z.string(),
    blocks: z.array(DashboardBlock),
  }),
  component: ({ props, renderNode }) => (
    <div className="flex h-full min-h-0 flex-col bg-[var(--surface)]">
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-2">{renderNode(props.blocks)}</div>
    </div>
  ),
});

export const dashboardRenderLibrary = createLibrary({
  root: "DashboardWidget",
  components: [
    DashboardWidget,
    MetricGrid,
    LineChart,
    BarChart,
    DataTable,
    InsightList,
    FormPreview,
  ],
});
