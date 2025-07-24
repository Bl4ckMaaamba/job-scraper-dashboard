"use client"

import { useState, useEffect } from "react"
import { Upload, Download, Settings, Activity, Search, Play, Pause, Square, CheckCircle, Clock, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface ScrapingJob {
  id: string
  sites: string[]
  status: "idle" | "running" | "completed" | "error" | "paused"
  progress: number
  startTime: Date
  results?: any[]
}

const SCRAPING_SITES = [
  { id: "indeed", name: "Indeed", color: "bg-blue-600", description: "Platform de recherche d'emploi leader" },
  { id: "linkedin", name: "LinkedIn", color: "bg-blue-700", description: "Réseau professionnel global" },
  { id: "proprietary", name: "Adaptive Scraper", color: "bg-purple-600", description: "Scraping intelligent des sites d'entreprises" },
]

const INTERVAL_OPTIONS = [
  { value: 5, label: "5 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 heure" },
  { value: 120, label: "2 heures" },
  { value: 240, label: "4 heures" },
  { value: 480, label: "8 heures" },
  { value: 1440, label: "24 heures" },
]

export default function JobScraperDashboard() {
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [interval, setIntervalMinutes] = useState<number>(60)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvContent, setCsvContent] = useState<string>("")
  const [currentJob, setCurrentJob] = useState<ScrapingJob | null>(null)
  const [autoMode, setAutoMode] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  const { toast } = useToast()

  // Load data from localStorage after hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSites = localStorage.getItem('selectedSites')
      const savedInterval = localStorage.getItem('interval')
      const savedCsvContent = localStorage.getItem('csvContent')
      const savedCurrentJob = localStorage.getItem('currentJob')
      const savedAutoMode = localStorage.getItem('autoMode')

      if (savedSites) setSelectedSites(JSON.parse(savedSites))
      if (savedInterval) setIntervalMinutes(parseInt(savedInterval))
      if (savedCsvContent) setCsvContent(savedCsvContent)
      if (savedCurrentJob) setCurrentJob(JSON.parse(savedCurrentJob))
      if (savedAutoMode) setAutoMode(JSON.parse(savedAutoMode))
      
      setIsHydrated(true)
    }
  }, [])

  const saveToLocalStorage = (key: string, value: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value))
    }
  }

  useEffect(() => {
    saveToLocalStorage('selectedSites', selectedSites)
  }, [selectedSites])

  useEffect(() => {
    saveToLocalStorage('interval', interval)
  }, [interval])

  useEffect(() => {
    saveToLocalStorage('csvContent', csvContent)
  }, [csvContent])

  useEffect(() => {
    saveToLocalStorage('currentJob', currentJob)
  }, [currentJob])

  useEffect(() => {
    saveToLocalStorage('autoMode', autoMode)
  }, [autoMode])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "text/csv") {
      setCsvFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setCsvContent(content)
      }
      reader.readAsText(file)
      
      toast({
        title: "Fichier chargé",
        description: `${file.name} a été chargé avec succès`,
      })
    } else {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier CSV valide",
        variant: "destructive",
      })
    }
  }

  const startScraping = async () => {
    if (selectedSites.length === 0) {
      toast({
        title: "Sélection requise",
        description: "Veuillez sélectionner au moins un site à scraper",
        variant: "destructive",
      })
      return
    }

    if (!csvFile) {
      toast({
        title: "Fichier requis",
        description: "Veuillez charger un fichier CSV d'entreprises",
        variant: "destructive",
      })
      return
    }

    const newJob: ScrapingJob = {
      id: `job_${Date.now()}`,
      sites: selectedSites,
      status: "running",
      progress: 0,
      startTime: new Date(),
    }

    setCurrentJob(newJob)

    try {
      const response = await fetch("/api/scraping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sites: selectedSites,
          csvData: csvContent,
          interval,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const updatedJob = {
          ...newJob,
          id: data.job?.id || newJob.id,
          status: data.job?.status || "running",
          progress: data.job?.progress || 0,
        }
        setCurrentJob(updatedJob)
        
        if (data.job?.status === "completed") {
          await checkResults(updatedJob.id)
        }

        toast({
          title: data.job?.status === "completed" ? "Scraping terminé" : "Scraping démarré",
          description: data.message || `Collecte en cours sur ${selectedSites.length} plateforme(s)`,
        })

      } else {
        toast({
          title: "Erreur",
          description: data.error || "Erreur lors du démarrage du scraping",
          variant: "destructive",
        })
        setCurrentJob({ ...newJob, status: "error" })
      }
    } catch (error) {
      console.error("Erreur lors du scraping:", error)
      toast({
        title: "Erreur",
        description: "Erreur lors du démarrage du scraping",
        variant: "destructive",
      })
      setCurrentJob({ ...newJob, status: "error" })
    }
  }

  const checkResults = async (jobId: string) => {
    try {
      const response = await fetch(`/api/results?jobId=${jobId}`)
      const data = await response.json()

      if (data.success) {
        const completedJob = {
          ...currentJob!,
          status: "completed" as const,
          progress: 100,
          results: data.results || [],
        }
        setCurrentJob(completedJob)

        toast({
          title: "Scraping terminé",
          description: `${data.results?.length || 0} offres d'emploi collectées avec succès`,
        })
      } else {
        setTimeout(() => checkResults(jobId), 10000)
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des résultats:", error)
      setTimeout(() => checkResults(jobId), 10000)
    }
  }

  const downloadResults = (job: ScrapingJob) => {
    if (job.results) {
      const dataStr = JSON.stringify(job.results, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `job_results_${new Date().toISOString().split('T')[0]}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
    }
  }

  const startAutomaticScraping = async () => {
    try {
      const response = await fetch("/api/clear-results", { method: "POST" })
      if (response.ok) {
        console.log("🔄 Auto mode: Previous results cleared")
      }
    } catch (error) {
      console.error("Auto cleanup error:", error)
    }

    console.log(`🤖 Auto mode: Starting scraping (interval: ${interval}min)`)
    await startScraping()
  }

  useEffect(() => {
    if (autoMode && selectedSites.length > 0 && csvFile) {
      console.log(`🤖 Auto mode ACTIVATED - Interval: ${interval} minutes`)
      
      if (!currentJob || currentJob.status === "completed" || currentJob.status === "idle") {
        startAutomaticScraping()
      }

      const autoInterval = setInterval(
        () => {
          if (!currentJob || currentJob.status === "completed" || currentJob.status === "idle") {
            console.log(`🕒 Auto mode: Scheduled trigger after ${interval} minutes`)
            startAutomaticScraping()
          } else {
            console.log(`⏳ Auto mode: Job in progress (${currentJob.status}), waiting...`)
          }
        },
        interval * 60 * 1000,
      )

      return () => {
        console.log("🤖 Auto mode DEACTIVATED")
        clearInterval(autoInterval)
      }
    } else if (autoMode) {
      console.log("⚠️ Auto mode: Incomplete configuration (missing sites or CSV)")
    }
  }, [autoMode, interval, selectedSites, csvFile, currentJob])

  if (!isHydrated) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-slate-600">Loading Dashboard...</p>
      </div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Job Scraper Dashboard
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Professional multi-platform job collection system with intelligent automation
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Configuration Panel */}
          <div className="xl:col-span-2 space-y-6">
            {/* Platform Selection */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="border-b border-slate-100 bg-white">
                <CardTitle className="flex items-center gap-3 text-xl text-slate-900">
                  <Target className="h-6 w-6 text-blue-600" />
                  Platform Selection
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Choose the job platforms to scrape
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {SCRAPING_SITES.map((site) => (
                    <div
                      key={site.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        selectedSites.includes(site.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => {
                        setSelectedSites(prev =>
                          prev.includes(site.id)
                            ? prev.filter(s => s !== site.id)
                            : [...prev, site.id]
                        )
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedSites.includes(site.id)}
                          onChange={() => {}}
                        />
                        <div className={`w-3 h-3 rounded-full ${site.color}`} />
                        <div>
                          <div className="font-medium text-slate-900">{site.name}</div>
                          <div className="text-sm text-slate-600">{site.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="border-b border-slate-100 bg-white">
                <CardTitle className="flex items-center gap-3 text-xl text-slate-900">
                  <Upload className="h-6 w-6 text-green-600" />
                  Company Data
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Upload CSV file with company names
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-slate-500" />
                      <p className="mb-2 text-sm text-slate-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-slate-500">CSV files only</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".csv"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
                
                {csvContent && (
                  <div className="space-y-3">
                    <Textarea
                      value={csvContent}
                      placeholder="CSV content will appear here..."
                      readOnly
                      className="h-32 text-sm bg-slate-50 border-slate-200"
                    />
                    <p className="text-sm text-slate-600 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {csvContent.split("\n").length - 1} companies detected
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Automation Settings */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="border-b border-slate-100 bg-white">
                <CardTitle className="flex items-center gap-3 text-xl text-slate-900">
                  <Settings className="h-6 w-6 text-purple-600" />
                  Automation Settings
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Configure automatic scraping intervals
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <Checkbox 
                    id="auto-mode" 
                    checked={autoMode} 
                    onCheckedChange={(checked) => setAutoMode(checked === true)} 
                  />
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    <Label htmlFor="auto-mode" className="font-medium text-slate-900">
                      Auto Mode
                    </Label>
                  </div>
                  {autoMode && (
                    <div className="ml-auto flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
                        🤖 Active
                      </Badge>
                    </div>
                  )}
                </div>

                {autoMode && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-2 block">
                        Repeat Interval
                      </Label>
                      <Select value={(interval || 60).toString()} onValueChange={(value) => setIntervalMinutes(Number(value))}>
                        <SelectTrigger className="border-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INTERVAL_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Auto Mode Status */}
            {autoMode && (
              <Card className="shadow-sm border-green-200 bg-green-50">
                <CardHeader className="border-b border-green-200 bg-green-100">
                  <CardTitle className="flex items-center gap-3 text-lg text-green-900">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    Auto Mode Active
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-green-800">Interval:</span>
                      <p className="text-green-700">{interval} minutes</p>
                    </div>
                    <div>
                      <span className="font-medium text-green-800">Sites:</span>
                      <p className="text-green-700">{selectedSites.length} selected</p>
                    </div>
                    <div>
                      <span className="font-medium text-green-800">Companies:</span>
                      <p className="text-green-700">{csvContent ? csvContent.split("\n").length - 1 : 0} detected</p>
                    </div>
                    <div>
                      <span className="font-medium text-green-800">Status:</span>
                      <p className="text-green-700">
                        {currentJob?.status === "running" ? "In progress..." : "Waiting"}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-green-200">
                    <p className="text-xs text-green-600">
                      🕒 Scraping will trigger automatically every {interval} minutes
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Control Panel */}
          <div className="space-y-6">
            {/* Current Job Status */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="border-b border-slate-100 bg-white">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Scraping Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {currentJob ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700">Progress</span>
                        <Badge variant="outline" className="border-blue-300 text-blue-700">
                          {Math.round(currentJob.progress)}%
                        </Badge>
                      </div>
                      <Progress value={currentJob.progress} className="h-2" />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Status</span>
                        <Badge variant={currentJob.status === "completed" ? "default" : "secondary"}>
                          {currentJob.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Sites</span>
                        <span className="text-sm font-medium">{currentJob.sites.length}</span>
                      </div>

                      {currentJob.results && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Results</span>
                          <span className="text-sm font-medium text-green-600">
                            {currentJob.results.length} jobs
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Button
                        onClick={startScraping}
                        disabled={currentJob.status === "running"}
                        className="w-full"
                        size="lg"
                      >
                        {currentJob.status === "running" ? (
                          <>
                            <Clock className="mr-2 h-4 w-4 animate-spin" />
                            Scraping in Progress
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Start New Scraping
                          </>
                        )}
                      </Button>

                      {currentJob.results && currentJob.results.length > 0 && (
                        <Button
                          onClick={() => downloadResults(currentJob)}
                          variant="outline"
                          className="w-full"
                          size="lg"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Results
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 mb-4">No active scraping job</p>
                    <Button
                      onClick={startScraping}
                      disabled={selectedSites.length === 0 || !csvFile}
                      className="w-full"
                      size="lg"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Start Scraping
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="border-b border-slate-100 bg-white">
                <CardTitle className="text-lg text-slate-900">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Selected Platforms</span>
                    <Badge variant="secondary">{selectedSites.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Companies Loaded</span>
                    <Badge variant="secondary">
                      {csvContent ? csvContent.split("\n").length - 1 : 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Auto Mode</span>
                    <Badge variant={autoMode ? "default" : "secondary"}>
                      {autoMode ? "ON" : "OFF"}
                    </Badge>
                  </div>
                  {currentJob && currentJob.results && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Last Results</span>
                      <Badge variant="default" className="bg-green-600">
                        {currentJob.results.length} jobs
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 