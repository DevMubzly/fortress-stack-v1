import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Zap, BarChart3, Lock } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-primary rounded-3xl mb-6 glow">
            <div className="w-10 h-10 bg-background rounded-xl"></div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold gradient-text mb-6">
            AI Cloud Admin
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Professional dashboard for managing your Private AI Cloud infrastructure. 
            Monitor API usage, system health, and performance metrics in real-time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login">
              <Button className="bg-gradient-primary hover:bg-primary-dark h-12 px-8 glow">
                Access Dashboard
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="outline" className="h-12 px-8">
                Create Account
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            {
              icon: Shield,
              title: "API Key Management",
              description: "Secure API key creation, rotation, and monitoring with usage analytics."
            },
            {
              icon: BarChart3,
              title: "Usage Metrics",
              description: "Real-time charts and analytics for requests, tokens, and performance."
            },
            {
              icon: Zap,
              title: "System Health",
              description: "Monitor GPU, CPU, memory usage and TGI model server status."
            },
            {
              icon: Lock,
              title: "Activity Logs",
              description: "Detailed request logs with full audit trail and error tracking."
            }
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="card-gradient shadow-card hover:shadow-glow transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center text-muted-foreground">
          <p>AI Cloud Admin Dashboard v1.0 - Built for enterprise-grade AI infrastructure</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
