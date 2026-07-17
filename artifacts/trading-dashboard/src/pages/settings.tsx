import { AppLayout } from "@/components/layout/app-layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as FormDesc } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGetCredentialsStatus, useSaveCredentials } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Shield, CheckCircle2, AlertTriangle, Key } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCredentialsStatusQueryKey } from "@workspace/api-client-react";

const credentialsSchema = z.object({
  apiKey: z.string().min(10, "API Key is required"),
  apiSecret: z.string().min(10, "API Secret is required"),
});

type CredentialsFormValues = z.infer<typeof credentialsSchema>;

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useGetCredentialsStatus();
  const saveCredentials = useSaveCredentials();

  const form = useForm<CredentialsFormValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      apiKey: "",
      apiSecret: "",
    },
  });

  const onSubmit = (data: CredentialsFormValues) => {
    saveCredentials.mutate({ data }, {
      onSuccess: () => {
        toast({
          title: "Credentials Saved",
          description: "Your Binance API credentials have been securely stored.",
        });
        form.reset({ apiKey: "", apiSecret: "" });
        queryClient.invalidateQueries({ queryKey: getGetCredentialsStatusQueryKey() });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Failed to save",
          description: "An error occurred while saving credentials.",
        });
      }
    });
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight mb-1 text-primary">SETTINGS</h1>
          <p className="text-sm text-muted-foreground">Configure connection to Binance Futures API.</p>
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-border shadow-none rounded-none">
            <CardHeader className="border-b border-border bg-card/50">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <Shield size={16} className="text-primary" />
                CONNECTION_STATUS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <Skeleton className="h-16 w-full rounded-none" />
              ) : status?.configured ? (
                <Alert className="rounded-none border-green-500/30 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle className="font-mono text-xs text-green-500">API CONFIGURED</AlertTitle>
                  <AlertDescription className="font-mono text-xs text-green-500/80">
                    Bot is connected and ready to trade. 
                    (Keys present: {status.hasApiKey ? 'Yes' : 'No'} / Secret present: {status.hasApiSecret ? 'Yes' : 'No'})
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive" className="rounded-none border-red-500/30 bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <AlertTitle className="font-mono text-xs text-red-500">NOT CONFIGURED</AlertTitle>
                  <AlertDescription className="font-mono text-xs text-red-500/80">
                    Binance API credentials are missing. Trading and testnet endpoints will fail.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-none rounded-none">
            <CardHeader className="border-b border-border bg-card/50">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <Key size={16} className="text-primary" />
                API_CREDENTIALS
              </CardTitle>
              <CardDescription className="font-mono text-xs mt-2">
                Update your Binance Futures Testnet API keys here. This will overwrite existing keys.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs">BINANCE API KEY</FormLabel>
                        <FormControl>
                          <Input 
                            className="font-mono rounded-none border-border focus-visible:ring-primary font-bold tracking-wider text-primary/80" 
                            placeholder="Enter API Key" 
                            type="password"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="apiSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs">BINANCE API SECRET</FormLabel>
                        <FormControl>
                          <Input 
                            className="font-mono rounded-none border-border focus-visible:ring-primary font-bold tracking-wider text-primary/80" 
                            placeholder="Enter API Secret" 
                            type="password"
                            {...field} 
                          />
                        </FormControl>
                        <FormDesc className="font-mono text-xs text-muted-foreground">
                          Keys are stored securely in the server environment and never exposed to the frontend.
                        </FormDesc>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={saveCredentials.isPending}
                    className="rounded-none font-mono tracking-wider font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {saveCredentials.isPending ? "SAVING..." : "UPDATE CREDENTIALS"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
