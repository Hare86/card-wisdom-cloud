import { useEffect, useState, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Maximize2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Category {
  name: string;
  value: number;
  color: string;
}

interface CategoryBreakdownProps {
  selectedCardId?: string | null;
  selectedCardName?: string;
}

// Category colors mapping
const categoryColors: Record<string, string> = {
  travel: "hsl(160, 84%, 39%)",
  dining: "hsl(43, 96%, 56%)",
  shopping: "hsl(199, 89%, 48%)",
  groceries: "hsl(280, 65%, 60%)",
  utilities: "hsl(340, 75%, 55%)",
  fuel: "hsl(25, 95%, 53%)",
  entertainment: "hsl(265, 83%, 57%)",
  other: "hsl(222, 40%, 40%)",
};

// Get color for a category (case-insensitive)
const getCategoryColor = (categoryName: string): string => {
  const normalizedName = categoryName.toLowerCase();
  return categoryColors[normalizedName] || categoryColors.other;
};

export function CategoryBreakdown({ selectedCardId, selectedCardName }: CategoryBreakdownProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalSpend, setTotalSpend] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCategoryData = useCallback(async () => {
    try {
      setLoading(true);

      // Build query based on selected card
      let query = supabase
        .from("transactions")
        .select("category, amount")
        .eq("user_id", user!.id);

      // Filter by selected card if provided
      if (selectedCardId) {
        query = query.eq("card_id", selectedCardId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate by category
      const categoryMap: Record<string, number> = {};
      let total = 0;

      (data || []).forEach((transaction) => {
        const category = transaction.category || "Other";
        const amount = Math.abs(transaction.amount || 0);
        categoryMap[category] = (categoryMap[category] || 0) + amount;
        total += amount;
      });

      // Convert to array and sort by value
      const categoryArray: Category[] = Object.entries(categoryMap)
        .map(([name, value]) => ({
          name,
          value: Math.round(value),
          color: getCategoryColor(name),
        }))
        .sort((a, b) => b.value - a.value);

      setCategories(categoryArray);
      setTotalSpend(Math.round(total));
    } catch (error) {
      console.error("Error fetching category data:", error);
      setCategories([]);
      setTotalSpend(0);
    } finally {
      setLoading(false);
    }
  }, [user, selectedCardId]);

  useEffect(() => {
    if (user) {
      fetchCategoryData();
    }
  }, [user, fetchCategoryData]);

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Spending by Category</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Spending by Category</h3>
            {selectedCardName && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Showing for {selectedCardName}
              </p>
            )}
          </div>
        </div>
        <p className="text-center text-muted-foreground py-8 text-sm">
          No spending data available{selectedCardName ? ` for ${selectedCardName}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Spending by Category</h3>
          {selectedCardName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Showing for {selectedCardName}
            </p>
          )}
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Spending by Category
                {selectedCardName && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    • {selectedCardName}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription>
                Detailed breakdown of your spending across different categories
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Large Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categories}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "14px",
                        }}
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, ""]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Category Details */}
                <div className="space-y-4">
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Spend</p>
                    <p className="text-3xl font-bold mt-1">₹{totalSpend.toLocaleString()}</p>
                  </div>

                  <div className="space-y-3">
                    {categories.map((category, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">₹{category.value.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {totalSpend > 0 ? Math.round((category.value / totalSpend) * 100) : 0}% of total
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`₹${value.toLocaleString()}`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2">
          {categories.slice(0, 4).map((category, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-sm">{category.name}</span>
              </div>
              <span className="text-sm font-medium">
                {totalSpend > 0 ? Math.round((category.value / totalSpend) * 100) : 0}%
              </span>
            </div>
          ))}
          {categories.length > 4 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{categories.length - 4} more categories
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Spend</span>
          <span className="text-lg font-bold">₹{totalSpend.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
