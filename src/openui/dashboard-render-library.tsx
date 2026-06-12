"use client";

import { createLibrary, defineComponent } from "@openuidev/react-lang";
import {
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

const MetricGrid = defineComponent({
  name: "MetricGrid",
  description: "A compact grid of KPI metric cards.",
  props: z.object({
    metrics: z.array(metricSchema),
  }),
  component: ({ props }) => {
    const metrics = asArray(props.metrics).map(safeMetric).slice(0, 4);

    return (
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((metric, index) => (
          <div
            className={`min-w-0 rounded-md border p-2.5 ${toneClasses[metric.tone]}`}
            key={`${metric.label}-${index}`}
          >
            <div className="truncate text-[11px] font-medium uppercase tracking-normal opacity-75">
              {metric.label}
            </div>
            <div className="mt-1 truncate text-xl font-semibold leading-tight text-[var(--text-primary)]">
              {metric.value}
            </div>
            {metric.delta ? (
              <div className="mt-1 truncate text-xs font-medium">{metric.delta}</div>
            ) : null}
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
    const series = asArray(props.series).map((item, index) => ({
      label: safeText(item?.label) || `Series ${index + 1}`,
      tone: safeTone(item?.tone),
    }));
    const rows = chartRows(props.data, series);
    const moneyUnit = chartMoneyUnit(props.title, series);

    return (
      <div className="min-h-0 rounded-md border border-[var(--border)] bg-[var(--panel)] p-2.5">
        <div className="mb-2 truncate text-sm font-semibold text-[var(--text-primary)]">{props.title}</div>
        <div className="h-[150px]">
          <ResponsiveContainer
            height="100%"
            initialDimension={{ height: 150, width: 1 }}
            minHeight={1}
            minWidth={1}
            width="100%"
          >
            <RechartsLineChart data={rows} margin={{ bottom: 0, left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                interval="preserveStartEnd"
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                tickFormatter={moneyUnit ? (value) => formatMoneyTick(value, moneyUnit) : undefined}
                tickLine={false}
                width={56}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: "var(--text-primary)",
                  fontSize: 12,
                }}
                itemStyle={{ color: "var(--text-primary)" }}
                labelStyle={{ color: "var(--text-secondary)" }}
              />
              {series.map((seriesItem, index) => (
                <Line
                  dataKey={`series${index}`}
                  dot={false}
                  key={`${seriesItem.label}-${index}`}
                  name={seriesItem.label}
                  stroke={seriesColors[seriesItem.tone]}
                  strokeDasharray={
                    props.projectionStartIndex >= 0 && index === series.length - 1
                      ? "4 4"
                      : undefined
                  }
                  strokeWidth={2}
                  type="monotone"
                />
              ))}
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </div>
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
    const series = asArray(props.series).map((item, index) => ({
      label: safeText(item?.label) || `Series ${index + 1}`,
      tone: safeTone(item?.tone),
    }));
    const rows = chartRows(props.data, series);
    const moneyUnit = chartMoneyUnit(props.title, series);

    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-2.5">
        <div className="mb-2 truncate text-sm font-semibold text-[var(--text-primary)]">{props.title}</div>
        <div className="h-[150px]">
          <ResponsiveContainer
            height="100%"
            initialDimension={{ height: 150, width: 1 }}
            minHeight={1}
            minWidth={1}
            width="100%"
          >
            <RechartsBarChart data={rows} margin={{ bottom: 0, left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickLine={false} />
              <YAxis
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                tickFormatter={moneyUnit ? (value) => formatMoneyTick(value, moneyUnit) : undefined}
                tickLine={false}
                width={56}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: "var(--text-primary)",
                  fontSize: 12,
                }}
                itemStyle={{ color: "var(--text-primary)" }}
                labelStyle={{ color: "var(--text-secondary)" }}
              />
              {series.map((seriesItem, index) => (
                <Bar
                  dataKey={`series${index}`}
                  fill={seriesColors[seriesItem.tone]}
                  key={`${seriesItem.label}-${index}`}
                  name={seriesItem.label}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>
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
      <div className="rounded-md border border-[var(--border)] bg-[var(--panel)]">
        {props.title ? (
          <div className="border-b border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
            {props.title}
          </div>
        ) : null}
        <div>
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-[var(--surface-muted)] text-[var(--text-secondary)]">
              <tr>
                {columns.map((column, index) => (
                  <th className="whitespace-nowrap px-3 py-2 font-semibold" key={`${column}-${index}`}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {rows.map((row, rowIndex) => (
                <tr className="text-[var(--text-primary)]" key={rowIndex}>
                  {columns.map((column, columnIndex) => (
                    <td className="whitespace-nowrap px-3 py-2" key={`${column}-${columnIndex}`}>
                      {tableCell(row, columnIndex)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
      <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-3">
        <div className="mb-2 truncate text-sm font-semibold text-[var(--text-primary)]">{props.title}</div>
        <div className="space-y-2">
          {items.map((item, index) => {
            const tone = safeTone(item?.tone);

            return (
              <div className="flex gap-2 text-xs" key={`${safeText(item?.label)}-${index}`}>
                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${toneClasses[tone]}`} />
                <div className="min-w-0">
                  <div className="font-semibold text-[var(--text-primary)]">{safeText(item?.label)}</div>
                  <div className="text-[var(--text-muted)]">{safeText(item?.detail)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
      <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-3">
        <div className="mb-3 truncate text-sm font-semibold text-[var(--text-primary)]">{props.title}</div>
        <div className="grid grid-cols-2 gap-2">
          {fields.map((field, index) => (
            <label className="min-w-0 text-xs font-medium text-[var(--text-secondary)]" key={`${safeText(field?.label)}-${index}`}>
              <span className="mb-1 block truncate">{safeText(field?.label)}</span>
              <input
                className="h-8 w-full rounded border border-[var(--border-strong)] bg-[var(--surface-muted)] px-2 text-xs text-[var(--text-primary)] outline-none"
                disabled
                placeholder={safeText(field?.placeholder)}
                type={field?.type === "number" ? "number" : field?.type === "date" ? "date" : "text"}
              />
            </label>
          ))}
        </div>
        <button
          className="mt-3 h-8 rounded bg-[var(--primary)] px-3 text-xs font-semibold text-[var(--primary-foreground)] opacity-80"
          disabled
          type="button"
        >
          {props.submitLabel}
        </button>
      </div>
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
    <div className="flex min-h-[320px] flex-col bg-[var(--surface)]">
      <div className="border-b border-[var(--border-soft)] px-4 py-3">
        <div className="truncate text-base font-semibold text-[var(--text-primary)]">{props.title}</div>
        {props.subtitle ? <div className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{props.subtitle}</div> : null}
        <div className="mt-2 inline-flex rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-[11px] font-medium text-[var(--text-muted)]">
          {props.dataDisclosure}
        </div>
      </div>
      <div className="flex-1 space-y-2 p-3">{renderNode(props.blocks)}</div>
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
