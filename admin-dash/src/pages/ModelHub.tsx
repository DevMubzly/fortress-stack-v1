import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Download, Trash2, Play, Pause, CheckCircle, Clock, HardDrive } from "lucide-react";
import { useState, useEffect } from "react";

const ModelHub = () => {
	const [searchTerm, setSearchTerm] = useState("");
	const [downloadingModels, setDownloadingModels] = useState<Record<string, number>>({});
	const [activeDownloads, setActiveDownloads] = useState<number>(0);
	const [downloaded, setDownloaded] = useState<Array<any>>([]);

	const API_BASE = "http://localhost:5000";
	// Start empty; rely on backend /models/curated
	const [available, setAvailable] = useState<Array<{
		id: string; name: string; description: string; size: string;
		downloads?: string; tags: string[]; category: string;
	}>>([]);

	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const res = await fetch(`${API_BASE}/models/curated`, { credentials: "include" });
				if (!res.ok) throw new Error(await res.text());
				const data = await res.json();
				if (!alive) return;
				const mapped = (data || []).map((m: any) => ({
					id: String(m.id ?? m.repo_id),
					name: String(m.name ?? m.repo_id ?? ""),
					description: String(m.description ?? ""),
					size: String(m.size_human ?? m.size ?? ""),
					downloads: String(m.downloads_hub ?? m.downloads ?? ""),
					tags: Array.isArray(m.tags) ? m.tags : [],
					category: String(m.category ?? "other"),
				}));
				setAvailable(mapped);
			} catch (e) {
				console.error("Failed to load curated models", e);
			}
		})();
		return () => { alive = false; };
	}, []);

	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const res = await fetch(`${API_BASE}/models/downloaded`, { credentials: "include" });
				if (!res.ok) throw new Error(await res.text());
				const data = await res.json();
				if (!alive) return;
				setDownloaded(data);
			} catch (e) {
				console.error("Failed to load downloaded models", e);
			}
		})();
		return () => { alive = false; };
	}, [downloadingModels]); // refetch after download

	const filteredModels = available.filter(model =>
		model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
		model.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
		model.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
	);

	const handleDownload = async (modelId: string) => {
		try {
			const res = await fetch(`${API_BASE}/models/download`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ repo_id: modelId }),
			});
			if (!res.ok) throw new Error(await res.text());
			const { job_id } = await res.json();
			setActiveDownloads((n) => n + 1);
			const poll = setInterval(async () => {
				const statusRes = await fetch(`${API_BASE}/models/jobs/${job_id}`, { credentials: "include" });
				if (!statusRes.ok) return;
				const job = await statusRes.json();
				setDownloadingModels((prev) => ({ ...prev, [modelId]: job.percent }));
				if (job.status === "done" || job.status === "error") {
					clearInterval(poll);
					setTimeout(() => {
						setDownloadingModels((prev) => {
							const { [modelId]: _, ...rest } = prev;
							return rest;
						});
						setActiveDownloads((n) => Math.max(0, n - 1));
					}, 1000);
				}
			}, 1000);
		} catch (e) {
			alert("Download failed: " + (e?.message || "Unknown error"));
		}
	};

	const isDownloaded = (modelId: string) => {
		return downloaded.some(dm => dm.id === modelId || dm.repo_id === modelId);
	};

	const isDownloading = (modelId: string) => {
		return modelId in downloadingModels;
	};

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
								<Input
									placeholder="Search models by name, description, or tags..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10"
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

										{isDownloading(model.id) && (
											<div className="space-y-2">
												<div className="flex justify-between text-sm">
													<span>Downloading...</span>
													<span>{downloadingModels[model.id]}%</span>
												</div>
												<Progress value={downloadingModels[model.id]} />
											</div>
										)}

										<div className="flex gap-2">
											{isDownloaded(model.id) ? (
												<Button variant="outline" disabled className="flex-1">
													<CheckCircle className="w-4 h-4 mr-2" />
													Downloaded
												</Button>
											) : isDownloading(model.id) ? (
												<Button variant="outline" disabled className="flex-1">
													<Clock className="w-4 h-4 mr-2" />
													Downloading...
												</Button>
											) : (
												<Button 
													onClick={() => handleDownload(model.id)}
													className="flex-1"
												>
													<Download className="w-4 h-4 mr-2" />
													Download
												</Button>
											)}
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					</TabsContent>

					<TabsContent value="downloaded" className="space-y-6">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{downloaded.map((model) => (
								<Card key={model.id} className="card-gradient shadow-card">
									<CardHeader>
										<div className="flex justify-between items-start">
											<div className="space-y-1">
												<CardTitle className="text-lg">{model.name}</CardTitle>
												<div className="flex items-center gap-2 text-sm text-muted-foreground">
													<HardDrive className="w-4 h-4" />
													<span>{model.size}</span>
													<span>•</span>
													<span>Downloaded {model.downloadedAt}</span>
												</div>
											</div>
											<Badge 
												variant={model.status === "ready" ? "default" : "secondary"}
											>
												{model.status}
											</Badge>
										</div>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="text-sm text-muted-foreground">
											Usage: {model.usage}
										</div>
										
										<div className="flex gap-2">
											<Button variant="outline" className="flex-1">
												<Play className="w-4 h-4 mr-2" />
												Load Model
											</Button>
											<Button variant="outline" size="icon">
												<Trash2 className="w-4 h-4" />
											</Button>
										</div>
									</CardContent>
								</Card>
							))}
						</div>

						{downloaded.length === 0 && (
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