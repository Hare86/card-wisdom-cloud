import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/integrations/supabase/lazyClient';
import { Loader2, Globe, Search, Map, Layers, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ScrapeResult {
  success: boolean;
  data?: {
    markdown?: string;
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
    };
  };
  error?: string;
}

export function WebScrapingDemo() {
  const { toast } = useToast();
  const [url, setUrl] = useState('https://www.hdfcbank.com/personal/pay/cards/credit-cards/infinia-credit-card');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [activeTab, setActiveTab] = useState('scrape');

  const handleScrape = async () => {
    if (!url.trim()) {
      toast({ title: 'Error', description: 'Please enter a URL', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Backend not configured');

      const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
        body: { 
          url: url.trim(),
          options: {
            formats: ['markdown'],
            onlyMainContent: true
          }
        }
      });

      if (error) throw error;

      setResult(data);
      toast({ 
        title: 'Success', 
        description: `Scraped: ${data?.data?.metadata?.title || url}` 
      });
    } catch (error) {
      console.error('Scrape error:', error);
      const message = error instanceof Error ? error.message : 'Failed to scrape';
      setResult({ success: false, error: message });
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const exampleUrls = [
    { label: 'HDFC Infinia', url: 'https://www.hdfcbank.com/personal/pay/cards/credit-cards/infinia-credit-card' },
    { label: 'Axis Atlas', url: 'https://www.axisbank.com/retail/cards/credit-card/atlas-credit-card' },
    { label: 'SBI Elite', url: 'https://www.sbicard.com/en/personal/credit-cards/travel/sbi-card-elite.page' },
  ];

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Web Scraping Demo
          </CardTitle>
          <CardDescription>
            Using Firecrawl to scrape credit card benefit pages for the RAG knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="scrape" className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                Scrape
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center gap-1" disabled>
                <Search className="w-4 h-4" />
                Search
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-1" disabled>
                <Map className="w-4 h-4" />
                Map
              </TabsTrigger>
              <TabsTrigger value="crawl" className="flex items-center gap-1" disabled>
                <Layers className="w-4 h-4" />
                Crawl
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scrape" className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Try:</span>
                {exampleUrls.map((ex) => (
                  <Badge 
                    key={ex.label}
                    variant="secondary" 
                    className="cursor-pointer hover:bg-primary/20"
                    onClick={() => setUrl(ex.url)}
                  >
                    {ex.label}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/credit-card-benefits"
                  className="flex-1"
                />
                <Button onClick={handleScrape} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 mr-2" />
                      Scrape
                    </>
                  )}
                </Button>
              </div>

              {result && (
                <Card className={result.success ? 'border-primary/50' : 'border-destructive/50'}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {result.data?.metadata?.title || 'Result'}
                      </CardTitle>
                      <Badge variant={result.success ? 'default' : 'destructive'}>
                        {result.success ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                    {result.data?.metadata?.sourceURL && (
                      <a 
                        href={result.data.metadata.sourceURL} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                      >
                        {result.data.metadata.sourceURL}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </CardHeader>
                  <CardContent>
                    {result.error ? (
                      <p className="text-destructive">{result.error}</p>
                    ) : result.data?.markdown ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none max-h-96 overflow-y-auto">
                        <ReactMarkdown>{result.data.markdown}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No content extracted</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">How it works:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Firecrawl scrapes the target URL and extracts clean markdown</li>
              <li>Content is processed to extract credit card benefits and features</li>
              <li>Data is embedded and stored in the <code>card_benefits</code> table</li>
              <li>RAG chat uses this knowledge base to answer benefit questions</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
