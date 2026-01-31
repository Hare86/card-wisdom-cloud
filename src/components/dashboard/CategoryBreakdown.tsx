import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Category {
  name: string;
  value: number;
  color: string;
}

interface CategoryBreakdownProps {
  categories: Category[];
  totalSpend: number;
}

export function CategoryBreakdown({ categories, totalSpend }: CategoryBreakdownProps) {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>

      <div className="flex items-center gap-6">
        <div className="w-32 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categories}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={3}
                dataKey="value"
              >
                {categories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222 47% 10%)",
                  border: "1px solid hsl(222 40% 16%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`₹${value.toLocaleString()}`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2">
          {categories.map((category, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-sm">{category.name}</span>
              </div>
              <span className="text-sm font-medium">
                {Math.round((category.value / totalSpend) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Monthly Spend</span>
          <span className="text-lg font-bold">₹{totalSpend.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
