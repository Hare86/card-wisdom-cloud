import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  ArrowLeft, 
  Search,
  Filter,
  Download,
  Receipt,
  Calendar,
  CreditCard,
  TrendingUp,
  X,
  PieChart as PieChartIcon,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface Transaction {
  id: string;
  description: string;
  merchant_name: string | null;
  amount: number;
  category: string | null;
  transaction_date: string;
  points_earned: number | null;
  card_id: string | null;
  is_masked: boolean | null;
  created_at: string;
  credit_cards?: {
    card_name: string;
    bank_name: string;
  } | null;
}

interface CreditCard {
  id: string;
  card_name: string;
  bank_name: string;
}

const ITEMS_PER_PAGE = 10;

const CATEGORY_COLORS: Record<string, string> = {
  dining: "bg-orange-500/20 text-orange-500",
  travel: "bg-blue-500/20 text-blue-500",
  shopping: "bg-pink-500/20 text-pink-500",
  groceries: "bg-green-500/20 text-green-500",
  fuel: "bg-yellow-500/20 text-yellow-500",
  entertainment: "bg-purple-500/20 text-purple-500",
  utilities: "bg-gray-500/20 text-gray-500",
  other: "bg-muted text-muted-foreground",
};

const CHART_COLORS = [
  "hsl(24, 95%, 53%)",   // orange - dining
  "hsl(199, 89%, 48%)",  // blue - travel
  "hsl(330, 81%, 60%)",  // pink - shopping
  "hsl(142, 71%, 45%)",  // green - groceries
  "hsl(48, 96%, 53%)",   // yellow - fuel
  "hsl(271, 91%, 65%)",  // purple - entertainment
  "hsl(215, 16%, 47%)",  // gray - utilities
  "hsl(160, 84%, 39%)",  // primary
];

export default function Transactions() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCard, setSelectedCard] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txRes, cardRes] = await Promise.all([
        supabase
          .from("transactions")
          .select(`
            *,
            credit_cards (
              card_name,
              bank_name
            )
          `)
          .order("transaction_date", { ascending: false }),
        supabase
          .from("credit_cards")
          .select("id, card_name, bank_name"),
      ]);

      if (txRes.error) throw txRes.error;
      if (cardRes.error) throw cardRes.error;

      setTransactions(txRes.data || []);
      setCards(cardRes.data || []);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(
        (txRes.data || [])
          .map(t => t.category)
          .filter((c): c is string => c !== null)
      )];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load transactions",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          tx.description?.toLowerCase().includes(query) ||
          tx.merchant_name?.toLowerCase().includes(query) ||
          tx.category?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Category filter
      if (selectedCategory !== "all" && tx.category !== selectedCategory) {
        return false;
      }
      
      // Card filter
      if (selectedCard !== "all" && tx.card_id !== selectedCard) {
        return false;
      }
      
      // Date range filter
      if (dateFrom && tx.transaction_date < dateFrom) {
        return false;
      }
      if (dateTo && tx.transaction_date > dateTo) {
        return false;
      }
      
      return true;
    });
  }, [transactions, searchQuery, selectedCategory, selectedCard, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedCard, dateFrom, dateTo]);

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalPoints = filteredTransactions.reduce((sum, tx) => sum + (tx.points_earned || 0), 0);
    return {
      count: filteredTransactions.length,
      total,
      totalPoints,
      avgAmount: filteredTransactions.length > 0 ? total / filteredTransactions.length : 0,
    };
  }, [filteredTransactions]);

  // Category breakdown for charts
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, { amount: number; count: number; points: number }> = {};
    
    filteredTransactions.forEach(tx => {
      const cat = tx.category || "Other";
      if (!breakdown[cat]) {
        breakdown[cat] = { amount: 0, count: 0, points: 0 };
      }
      breakdown[cat].amount += tx.amount;
      breakdown[cat].count += 1;
      breakdown[cat].points += tx.points_earned || 0;
    });
    
    return Object.entries(breakdown)
      .map(([name, data], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        amount: data.amount,
        count: data.count,
        points: data.points,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedCard("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = searchQuery || selectedCategory !== "all" || selectedCard !== "all" || dateFrom || dateTo;

  const exportToCSV = () => {
    const headers = ["Date", "Description", "Merchant", "Category", "Amount", "Points Earned", "Card"];
    const rows = filteredTransactions.map(tx => [
      tx.transaction_date,
      tx.description,
      tx.merchant_name || "",
      tx.category || "",
      tx.amount.toString(),
      (tx.points_earned || 0).toString(),
      tx.credit_cards ? `${tx.credit_cards.bank_name} ${tx.credit_cards.card_name}` : "",
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Exported ${filteredTransactions.length} transactions`,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />

      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button variant="ghost" onClick={() => navigate("/")} className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl lg:text-3xl font-bold">
              <span className="gradient-text">Transaction</span> History
            </h1>
            <p className="text-muted-foreground">View and filter all your parsed transactions</p>
          </div>
          <Button onClick={exportToCSV} variant="outline" disabled={filteredTransactions.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.count}</p>
                  <p className="text-xs text-muted-foreground">Transactions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">₹{stats.total.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-info/20 rounded-lg">
                  <CreditCard className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Points Earned</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">₹{stats.avgAmount.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Avg. Amount</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown Charts */}
        {!loading && categoryBreakdown.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Pie Chart - Spending Distribution */}
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Spending by Category</CardTitle>
                </div>
                <CardDescription>Distribution of your spending across categories</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="amount"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, "Amount"]}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar Chart - Category Comparison */}
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-secondary" />
                  <CardTitle className="text-lg">Category Comparison</CardTitle>
                </div>
                <CardDescription>Amount spent and points earned per category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={categoryBreakdown} layout="vertical">
                    <XAxis type="number" tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={80}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === "amount" ? `₹${value.toLocaleString()}` : value.toLocaleString(),
                        name === "amount" ? "Amount" : "Points"
                      ]}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Legend />
                    <Bar dataKey="amount" fill="hsl(160, 84%, 39%)" name="Amount (₹)" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="points" fill="hsl(43, 96%, 56%)" name="Points" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="glass-card mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="text-lg">Filters</CardTitle>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <Label htmlFor="search" className="sr-only">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category" className="sr-only">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat} className="capitalize">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Card */}
              <div>
                <Label htmlFor="card" className="sr-only">Card</Label>
                <Select value={selectedCard} onValueChange={setSelectedCard}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Cards" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cards</SelectItem>
                    {cards.map(card => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.bank_name} {card.card_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="From"
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="To"
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              {hasActiveFilters 
                ? `Showing ${filteredTransactions.length} of ${transactions.length} transactions`
                : `${transactions.length} total transactions`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : paginatedTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No transactions found</h3>
                <p className="text-muted-foreground">
                  {hasActiveFilters 
                    ? "Try adjusting your filters" 
                    : "Upload a credit card statement to see your transactions here"}
                </p>
                {!hasActiveFilters && (
                  <Button onClick={() => navigate("/upload")} className="mt-4">
                    Upload Statement
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Card</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(tx.transaction_date), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{tx.merchant_name || tx.description}</p>
                              {tx.merchant_name && tx.description !== tx.merchant_name && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {tx.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {tx.category && (
                              <Badge 
                                variant="secondary" 
                                className={`capitalize ${CATEGORY_COLORS[tx.category.toLowerCase()] || CATEGORY_COLORS.other}`}
                              >
                                {tx.category}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {tx.credit_cards ? (
                              <span className="text-sm">
                                {tx.credit_cards.bank_name} {tx.credit_cards.card_name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{tx.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {tx.points_earned ? (
                              <span className="text-primary font-medium">
                                +{tx.points_earned.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setCurrentPage(pageNum)}
                                isActive={currentPage === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
