import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, HardDrive } from "lucide-react";
import { useState } from "react";

const STATIC_MODELS = [
	{
		id: "tinyllama",
		name: "TinyLlama",
		description: "A compact, efficient Llama model for quick prototyping.",
		size: "1.1GB",
		downloads: "12,345",
		tags: ["llama", "small", "fast"],
		category: "llm",
	},
	{
		id: "mistral-7b",
		name: "Mistral 7B",
		description: "A powerful open-source 7B parameter model.",
		size: "13GB",
		downloads: "8,900",
		tags: ["mistral", "open-source", "7B"],
		category: "llm",
	},
];

const STATIC_DOWNLOADED = [
	{
		id: "tinyllama",
		name: "TinyLlama",
		size: "1.1GB",
		downloadedAt: "2025-09-21",
		usage: "Available",
	},
];

const ModelHub = () => {
	const [searchTerm, setSearchTerm] = useState("");

	const filteredModels = STATIC_MODELS.filter(model =>
		model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
		model.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
		model.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
	);

	return (
		<DashboardLayout>
			<div className="space-y-6">
				<div className="flex flex-col gap-2">
					<h1 className="text-3xl font-bold text-foreground">Model Hub</h1>
					<p className="text-muted-foreground">
						Discover, download, and manage AI models from Hugging Face
					</p>
				</div>

				<Tabs defaultValue="browse" className="space-y-6">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="browse">Browse Models</TabsTrigger>
						<TabsTrigger value="downloaded">Downloaded Models</TabsTrigger>
					</TabsList>

					<TabsContent value="browse" className="space-y-6">
						<div className="flex gap-4">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
								<input
									placeholder="Search models by name, description, or tags..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10 border rounded h-10 w-full bg-background"
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{filteredModels.map((model) => (
								<Card key={model.id} className="card-gradient shadow-card">
									<CardHeader>
										<div className="flex justify-between items-start">
											<div className="space-y-1">
												<CardTitle className="text-lg">{model.name}</CardTitle>
												<CardDescription>{model.description}</CardDescription>
											</div>
											<Badge variant="secondary">{model.category}</Badge>
										</div>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="flex flex-wrap gap-2">
											{model.tags.map((tag) => (
												<Badge key={tag} variant="outline" className="text-xs">
													{tag}
												</Badge>
											))}
										</div>
										<div className="flex justify-between text-sm text-muted-foreground">
											<span>Size: {model.size}</span>
											<span>Downloads: {model.downloads}</span>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					</TabsContent>

					<TabsContent value="downloaded" className="space-y-6">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{STATIC_DOWNLOADED.map((model) => (
								<Card key={model.id || model.name}>
									<CardHeader>
										<CardTitle>{model.name || "Unknown Model"}</CardTitle>
										<div className="flex items-center gap-2 text-sm text-muted-foreground">
											<HardDrive className="w-4 h-4" />
											<span>{model.size}</span>
											<span>•</span>
											<span>Downloaded {model.downloadedAt}</span>
										</div>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="text-sm text-muted-foreground">
											Usage: {model.usage}
										</div>
									</CardContent>
								</Card>
							))}
						</div>

						{STATIC_DOWNLOADED.length === 0 && (
							<Card className="card-gradient shadow-card">
								<CardContent className="p-12 text-center">
									<div className="text-muted-foreground">
										<HardDrive className="w-12 h-12 mx-auto mb-4" />
										<p className="text-lg mb-2">No Downloaded Models</p>
										<p className="text-sm">Browse the model hub to download models for your projects</p>
									</div>
								</CardContent>
							</Card>
						)}
					</TabsContent>
				</Tabs>
			</div>
		</DashboardLayout>
	);
};

export default ModelHub;