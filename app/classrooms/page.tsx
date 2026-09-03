"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ref, onValue, push, set, get, remove } from "firebase/database"
import { db } from "@/lib/firebase"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  Loader2, 
  Plus, 
  Save, 
  ArrowLeft, 
  Package, 
  PackageCheck, 
  Trash2, 
  Calendar,
  ExternalLink 
} from "lucide-react"
import Link from "next/link"

interface Program {
  id: string
  name: string
  version: string
}

interface SupplyItem {
  id: string
  classId: string
  className: string
  itemName: string
  quantity: number
  category?: string
  notes?: string
  date: string
  addedBy?: string
}

function ClassroomContent() {
  const searchParams = useSearchParams()
  const classId = searchParams.get("id")
  
  const [className, setClassName] = useState("Yükleniyor...")
  const [classLocation, setClassLocation] = useState("")
  
  // Programs State
  const [programs, setPrograms] = useState<Program[]>([])
  const [newProgramName, setNewProgramName] = useState("")
  const [newProgramVersion, setNewProgramVersion] = useState("")
  const [addingProgram, setAddingProgram] = useState(false)

  // Supplies State
  const [supplies, setSupplies] = useState<SupplyItem[]>([])
  const [newSupplyName, setNewSupplyName] = useState("")
  const [newSupplyQty, setNewSupplyQty] = useState(1)
  const [addingSupply, setAddingSupply] = useState(false)

  // Notes State
  const [notes, setNotes] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  useEffect(() => {
    if (!classId) {
      setClassName("Sınıf ID eksik")
      return
    }

    // 1. Fetch Class Info
    get(ref(db, "classrooms/" + classId)).then((snapshot) => {
      if (snapshot.exists()) {
        setClassName(snapshot.val().name)
        setClassLocation(snapshot.val().location || "")
      } else {
        setClassName("Bulunamadı")
      }
    }).catch(console.error)

    // 2. Listen to Programs
    const unsubPrograms = onValue(ref(db, "classrooms/" + classId + "/programs"), (snapshot) => {
      const progList: Program[] = []
      snapshot.forEach((child) => {
        progList.push({ id: child.key, ...child.val() } as Program)
      })
      setPrograms(progList)
    })

    // 3. Listen to Notes
    const unsubNotes = onValue(ref(db, "classrooms/" + classId + "/notes"), (snapshot) => {
      if (snapshot.exists() && snapshot.val().content) {
        setNotes(snapshot.val().content)
      }
    })

    // 4. Listen to Supplies for this classroom
    const unsubSupplies = onValue(ref(db, "classroom_supplies"), (snapshot) => {
      const supList: SupplyItem[] = []
      snapshot.forEach((child) => {
        const val = child.val()
        if (val.classId === classId) {
          supList.push({ id: child.key, ...val } as SupplyItem)
        }
      })
      supList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setSupplies(supList)
    })

    return () => {
      unsubPrograms()
      unsubNotes()
      unsubSupplies()
    }
  }, [classId])

  const handleAddProgram = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProgramName.trim() || !classId) return

    setAddingProgram(true)
    try {
      const newProgRef = push(ref(db, "classrooms/" + classId + "/programs"))
      await set(newProgRef, {
        name: newProgramName.trim(),
        version: newProgramVersion.trim() || "Bilinmiyor",
        addedAt: new Date().toISOString()
      })
      setNewProgramName("")
      setNewProgramVersion("")
    } catch (error) {
      console.error(error)
    } finally {
      setAddingProgram(false)
    }
  }

  const handleAddSupply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSupplyName.trim() || !classId) return

    const currentUsername = typeof window !== "undefined" ? localStorage.getItem("currentUsername") || "Yetkili" : "Yetkili"
    setAddingSupply(true)
    try {
      const newSupRef = push(ref(db, "classroom_supplies"))
      await set(newSupRef, {
        classId,
        className,
        classLocation,
        itemName: newSupplyName.trim(),
        quantity: Number(newSupplyQty) || 1,
        date: new Date().toISOString().split("T")[0],
        addedBy: currentUsername,
        createdAt: new Date().toISOString()
      })
      setNewSupplyName("")
      setNewSupplyQty(1)
    } catch (error) {
      console.error(error)
    } finally {
      setAddingSupply(false)
    }
  }

  const handleDeleteSupply = async (id: string) => {
    if (confirm("Bu malzeme kaydını silmek istiyor musunuz?")) {
      try {
        await remove(ref(db, `classroom_supplies/${id}`))
      } catch (error) {
        console.error(error)
      }
    }
  }

  const handleSaveNotes = async () => {
    if (!classId) return
    setSavingNotes(true)
    try {
      await set(ref(db, "classrooms/" + classId + "/notes"), {
        content: notes,
        updatedAt: new Date().toISOString()
      })
      setLastSaved(new Date())
    } catch (error) {
      console.error(error)
    } finally {
      setSavingNotes(false)
    }
  }

  if (!classId) {
    return (
      <div className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4">Geçersiz Sınıf</h1>
        <Link href="/">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 md:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard'a Dön
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Sınıf: {className}</h1>
          {classLocation && (
            <p className="text-sm font-medium text-primary mt-0.5">{classLocation}</p>
          )}
          <p className="text-muted-foreground text-sm mt-1">Yüklü programları, alınan donanım/malzemeleri ve teknik notları yönetin.</p>
        </div>

        <Link href="/supplies">
          <Button variant="outline" size="sm" className="gap-2">
            <PackageCheck className="h-4 w-4 text-primary" />
            Tüm Sınıf Alımları
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sol Kolon: Alınan Malzemeler & Donanımlar */}
        <div className="space-y-6">
          <Card className="border-primary/20 shadow-sm bg-card/90 backdrop-blur-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <PackageCheck className="h-5 w-5 text-primary" />
                  Bu Sınıfa Alınanlar & Malzemeler ({supplies.length})
                </CardTitle>
                <span className="text-xs text-muted-foreground font-medium">
                  Toplam: {supplies.reduce((a, b) => a + (Number(b.quantity) || 1), 0)} Adet
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <form className="flex flex-col sm:flex-row gap-2" onSubmit={handleAddSupply}>
                <Input 
                  placeholder="Alınan Malzeme (Örn: HDMI Kablo)" 
                  value={newSupplyName} 
                  onChange={(e) => setNewSupplyName(e.target.value)} 
                  className="flex-1"
                />
                <Input 
                  type="number"
                  min="1"
                  placeholder="Adet" 
                  className="w-full sm:w-20"
                  value={newSupplyQty} 
                  onChange={(e) => setNewSupplyQty(Math.max(1, parseInt(e.target.value) || 1))} 
                />
                <Button type="submit" disabled={addingSupply || !newSupplyName.trim()} className="gap-1.5 shrink-0">
                  {addingSupply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>Ekle</span>
                </Button>
              </form>

              <div className="border rounded-lg divide-y max-h-[350px] overflow-y-auto">
                {supplies.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Bu sınıfa henüz bir malzeme veya donanım alımı kaydedilmemiş.
                  </div>
                ) : (
                  supplies.map(item => (
                    <div key={item.id} className="p-3 flex justify-between items-center hover:bg-muted/40 transition-colors">
                      <div className="space-y-1">
                        <div className="font-medium text-sm text-foreground flex items-center gap-2">
                          <span>{item.itemName}</span>
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {item.quantity} Adet
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(item.date).toLocaleDateString("tr-TR")}</span>
                          {item.notes && <span>• {item.notes}</span>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteSupply(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Programlar Kartı */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Package className="h-5 w-5 text-primary" />
                Yüklü Programlar ({programs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <form className="flex gap-2" onSubmit={handleAddProgram}>
                <Input 
                  placeholder="Program Adı" 
                  value={newProgramName} 
                  onChange={(e) => setNewProgramName(e.target.value)} 
                />
                <Input 
                  placeholder="Sürüm" 
                  className="w-1/3"
                  value={newProgramVersion} 
                  onChange={(e) => setNewProgramVersion(e.target.value)} 
                />
                <Button type="submit" disabled={addingProgram || !newProgramName.trim()} size="icon">
                  {addingProgram ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </form>

              <div className="border rounded-md divide-y max-h-[250px] overflow-y-auto">
                {programs.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Henüz program eklenmemiş.</div>
                ) : (
                  programs.map(p => (
                    <div key={p.id} className="p-3 flex justify-between items-center bg-card/50">
                      <span className="font-medium text-sm">{p.name}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full border">{p.version}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sağ Kolon: Notlar */}
        <div className="space-y-6">
          <Card className="h-full flex flex-col min-h-[450px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/50">
              <CardTitle className="text-base md:text-lg">Teknik Notlar</CardTitle>
              <Button variant="outline" size="sm" onClick={handleSaveNotes} disabled={savingNotes} className="gap-2">
                {savingNotes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Kaydet
              </Button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-2 pt-4">
              <Textarea 
                placeholder="Bu sınıftaki bilgisayarlar hakkında teknik notlar alın (Örn: PC-5'in klavyesi arızalı, Projeksiyon lambası yeni değişti...)" 
                className="flex-1 min-h-[300px] resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              {lastSaved && (
                <p className="text-xs text-right text-muted-foreground font-medium">
                  Son kaydetme: {lastSaved.toLocaleTimeString()}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function ClassroomPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="p-10 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>}>
        <ClassroomContent />
      </Suspense>
    </AuthGuard>
  )
}

