import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/safeClient";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  ArrowLeft, 
  DollarSign, 
  Zap, 
  Target, 
  Shield,
  TrendingUp,
  Database,
  RefreshCw
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface TokenUsageData {
  summary: {
    total_requests: number;
    total_tokens_input: number;
    total_tokens_output: number;
    total_cost: number;
    cache_hit_rate: number;
    cache_savings: number;
  };
  by_model: Record<string, { count: number; cost: number; tokens: number }>;
  by_query_type: Record<string, { count: number; cost: number }>;
}

interface EvaluationData {
  summary: {
    total_evaluations: number;
    avg_faithfulness: number;
    avg_relevance: number;
    avg_latency_ms: number;
  };
  quality_distribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

interface ComplianceData {
  summary: {
    total_compliance_events: number;
    total_pii_masking_events: number;
    total_fields_masked: number;
    pii_always_masked: boolean;
  };
  pii_types_found: Record<string, number>;
  gdpr_compliance: Record<string, boolean>;
  pci_dss_alignment: Record<string, boolean>;
}

interface ROIData {
  costs: {
    total_ai_cost: number;
    cost_per_query: number;
    cache_savings_percent: number;
  };
  value: {
    total_queries: number;
    estimated_user_value: number;
    roi_ratio: number;
  };
  optimization_suggestions: string[];
}

const COLORS = ["hsl(160, 84%, 39%)", "hsl(43, 96%, 56%)", "hsl(199, 89%, 48%)", "hsl(0, 72%, 51%)"];

export default function Analytics() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tokenUsage, setTokenUsage] = useState<TokenUsageData | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationData | null>(null);
  const [compliance, setCompliance] = useState<ComplianceData | null>(null);
  const [roi, setROI] = useState<ROIData | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [tokenRes, evalRes, compRes, roiRes] = await Promise.all([
        supabase.functions.invoke("analytics", { body: { action: "token-usage", userId: user?.id } }),
        supabase.functions.invoke("analytics", { body: { action: "evaluation-metrics", userId: user?.id } }),
        supabase.functions.invoke("analytics", { body: { action: "compliance-report" } }),
        supabase.functions.invoke("analytics", { body: { action: "roi-analysis" } }),
      ]);

      if (tokenRes.data) setTokenUsage(tokenRes.data);
      if (evalRes.data) setEvaluations(evalRes.data);
      if (compRes.data) setCompliance(compRes.data);
      if (roiRes.data) setROI(roiRes.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load analytics data",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, fetchAnalytics]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const qualityData = evaluations ? [
    { name: "Excellent", value: evaluations.quality_distribution.excellent, color: COLORS[0] },
    { name: "Good", value: evaluations.quality_distribution.good, color: COLORS[1] },
    { name: "Fair", value: evaluations.quality_distribution.fair, color: COLORS[2] },
    { name: "Poor", value: evaluations.quality_distribution.poor, color: COLORS[3] },
  ] : [];

  const modelData = tokenUsage ? Object.entries(tokenUsage.by_model).map(([name, data]) => ({
    name: name.split("/")[1] || name,
    requests: data.count,
    cost: data.cost,
  })) : [];

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
              <span className="gradient-text">Analytics</span> & Compliance
            </h1>
            <p className="text-muted-foreground">RAG evaluation, token usage, and security metrics</p>
          </div>
          <Button onClick={fetchAnalytics} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="usage" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="usage">Token Usage</TabsTrigger>
            <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="roi">ROI</TabsTrigger>
          </TabsList>

          {/* Token Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{tokenUsage?.summary.total_requests || 0}</p>
                      <p className="text-xs text-muted-foreground">Total Requests</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/20 rounded-lg">
                      <DollarSign className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">${tokenUsage?.summary.total_cost.toFixed(4) || "0"}</p>
                      <p className="text-xs text-muted-foreground">Total Cost</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-info/20 rounded-lg">
                      <Database className="w-5 h-5 text-info" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{((tokenUsage?.summary.cache_hit_rate || 0) * 100).toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">Cache Hit Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/20 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">${tokenUsage?.summary.cache_savings.toFixed(4) || "0"}</p>
                      <p className="text-xs text-muted-foreground">Cache Savings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Usage by Model</CardTitle>
                <CardDescription>Request distribution and cost per model</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={modelData}>
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="requests" fill="hsl(160, 84%, 39%)" name="Requests" />
                    <Bar yAxisId="right" dataKey="cost" fill="hsl(43, 96%, 56%)" name="Cost ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Evaluation Tab */}
          <TabsContent value="evaluation" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <p className="text-2xl font-bold">{((evaluations?.summary.avg_faithfulness || 0) * 100).toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Avg Faithfulness</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <p className="text-2xl font-bold">{((evaluations?.summary.avg_relevance || 0) * 100).toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Avg Relevance</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <p className="text-2xl font-bold">{evaluations?.summary.avg_latency_ms?.toFixed(0) || 0}ms</p>
                  <p className="text-xs text-muted-foreground">Avg Latency</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <p className="text-2xl font-bold">{evaluations?.summary.total_evaluations || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Evaluations</p>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Response Quality Distribution</CardTitle>
                <CardDescription>RAGAS-style quality metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={qualityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {qualityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    PII Protection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Fields Masked</span>
                    <span className="font-bold">{compliance?.summary.total_fields_masked || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Masking Events</span>
                    <span className="font-bold">{compliance?.summary.total_pii_masking_events || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">100% Masked</span>
                    <span className={`font-bold ${compliance?.summary.pii_always_masked ? "text-primary" : "text-destructive"}`}>
                      {compliance?.summary.pii_always_masked ? "Yes ✓" : "No ✗"}
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">PII Types Detected:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(compliance?.pii_types_found || {}).map(([type, count]) => (
                        <span key={type} className="px-2 py-1 bg-muted rounded-full text-xs">
                          {type}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-secondary" />
                    Regulatory Alignment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-medium mb-2">GDPR Compliance</p>
                    <div className="space-y-1">
                      {Object.entries(compliance?.gdpr_compliance || {}).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{key.replace(/_/g, " ")}</span>
                          <span className="text-primary">✓</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium mb-2">PCI-DSS Alignment</p>
                    <div className="space-y-1">
                      {Object.entries(compliance?.pci_dss_alignment || {}).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{key.replace(/_/g, " ")}</span>
                          <span className={value ? "text-primary" : "text-destructive"}>
                            {value ? "✓" : "✗"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ROI Tab */}
          <TabsContent value="roi" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <p className="text-2xl font-bold">${roi?.costs.total_ai_cost.toFixed(4) || "0"}</p>
                  <p className="text-xs text-muted-foreground">Total AI Cost</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <p className="text-2xl font-bold">₹{roi?.value.estimated_user_value.toFixed(0) || "0"}</p>
                  <p className="text-xs text-muted-foreground">Estimated User Value</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <p className="text-2xl font-bold text-primary">{roi?.value.roi_ratio.toFixed(1) || "0"}x</p>
                  <p className="text-xs text-muted-foreground">ROI Ratio</p>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Optimization Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                {roi?.optimization_suggestions && roi.optimization_suggestions.length > 0 ? (
                  <ul className="space-y-2">
                    {roi.optimization_suggestions.map((suggestion, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-secondary">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No optimization suggestions at this time.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
