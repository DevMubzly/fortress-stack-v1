import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Pause, 
  Square, 
  Upload, 
  Brain, 
  Zap, 
  Settings, 
  FileText, 
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useState } from "react";

const trainingJobs = [
  {
    id: "1",
    name: "Customer Support Bot",
    model: "microsoft/DialoGPT-medium",
    status: "completed",
    progress: 100,
    startedAt: "2024-01-15 14:30",
    duration: "2h 45m",
    accuracy: "94.2%"
  },
  {
    id: "2", 
    name: "Sentiment Analysis",
    model: "google/flan-t5-large",
    status: "training",
    progress: 67,
    startedAt: "2024-01-16 09:15",
    duration: "1h 23m",
    accuracy: "89.1%"
  },
  {
    id: "3",
    name: "Document Classification",
    model: "sentence-transformers/all-MiniLM-L6-v2", 
    status: "failed",
    progress: 45,
    startedAt: "2024-01-14 16:20",
    duration: "45m",
    accuracy: "N/A"
  }
];

const Training = () => {
  const [selectedModel, setSelectedModel] = useState("");
  const [jobName, setJobName] = useState("");
  const [learningRate, setLearningRate] = useState("2e-5");
  const [batchSize, setBatchSize] = useState("16");
  const [epochs, setEpochs] = useState("3");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "training": return "secondary";
      case "failed": return "destructive";
      default: return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "training": return <Clock className="w-4 h-4" />;
      case "failed": return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">Training & Finetuning</h1>
          <p className="text-muted-foreground">
            Train and finetune AI models for your specific use cases
          </p>
        </div>

        <Tabs defaultValue="new-training" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="new-training">New Training</TabsTrigger>
            <TabsTrigger value="training-jobs">Training Jobs</TabsTrigger>
            <TabsTrigger value="metrics">Metrics & Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="new-training" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="card-gradient shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Model Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure your model and training parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="job-name">Training Job Name</Label>
                    <Input
                      id="job-name"
                      placeholder="Enter a name for your training job"
                      value={jobName}
                      onChange={(e) => setJobName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="base-model">Base Model</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a base model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        <SelectItem value="microsoft/DialoGPT-medium">DialoGPT Medium</SelectItem>
                        <SelectItem value="google/flan-t5-large">FLAN-T5 Large</SelectItem>
                        <SelectItem value="sentence-transformers/all-MiniLM-L6-v2">MiniLM-L6</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="learning-rate">Learning Rate</Label>
                      <Input
                        id="learning-rate"
                        value={learningRate}
                        onChange={(e) => setLearningRate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batch-size">Batch Size</Label>
                      <Input
                        id="batch-size"
                        value={batchSize}
                        onChange={(e) => setBatchSize(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="epochs">Epochs</Label>
                    <Input
                      id="epochs"
                      value={epochs}
                      onChange={(e) => setEpochs(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-gradient shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Dataset Upload
                  </CardTitle>
                  <CardDescription>
                    Upload your training data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drop your training files here or click to browse
                    </p>
                    <Button variant="outline">
                      Select Files
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataset-description">Dataset Description</Label>
                    <Textarea
                      id="dataset-description"
                      placeholder="Describe your dataset and training objectives..."
                      rows={4}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Training Options</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
                        <Zap className="w-6 h-6" />
                        <span className="text-sm">Quick Training</span>
                        <span className="text-xs text-muted-foreground">~30 minutes</span>
                      </Button>
                      
                      <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
                        <Settings className="w-6 h-6" />
                        <span className="text-sm">Advanced Training</span>
                        <span className="text-xs text-muted-foreground">Custom parameters</span>
                      </Button>
                    </div>

                    <Button className="w-full" size="lg">
                      <Play className="w-4 h-4 mr-2" />
                      Start Training
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="training-jobs" className="space-y-6">
            <div className="space-y-4">
              {trainingJobs.map((job) => (
                <Card key={job.id} className="card-gradient shadow-card">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{job.name}</CardTitle>
                        <CardDescription>
                          Model: {job.model}
                        </CardDescription>
                      </div>
                      <Badge variant={getStatusColor(job.status)} className="flex items-center gap-1">
                        {getStatusIcon(job.status)}
                        {job.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Started:</span>
                        <p className="font-medium">{job.startedAt}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duration:</span>
                        <p className="font-medium">{job.duration}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Accuracy:</span>
                        <p className="font-medium">{job.accuracy}</p>
                      </div>
                    </div>

                    {job.status === "training" && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{job.progress}%</span>
                        </div>
                        <Progress value={job.progress} />
                      </div>
                    )}

                    <div className="flex gap-2">
                      {job.status === "training" ? (
                        <>
                          <Button variant="outline" size="sm">
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </Button>
                          <Button variant="outline" size="sm">
                            <Square className="w-4 h-4 mr-2" />
                            Stop
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="card-gradient shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Training Accuracy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold gradient-text">94.2%</div>
                  <p className="text-sm text-muted-foreground">Best performing model</p>
                </CardContent>
              </Card>

              <Card className="card-gradient shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Avg. Training Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold gradient-text">2h 15m</div>
                  <p className="text-sm text-muted-foreground">Per training job</p>
                </CardContent>
              </Card>

              <Card className="card-gradient shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Models Trained
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold gradient-text">24</div>
                  <p className="text-sm text-muted-foreground">This month</p>
                </CardContent>
              </Card>
            </div>

            <Card className="card-gradient shadow-card">
              <CardHeader>
                <CardTitle>Training Performance Trends</CardTitle>
                <CardDescription>
                  Track your model training performance over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4" />
                    <p>Training metrics visualization would appear here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Training;