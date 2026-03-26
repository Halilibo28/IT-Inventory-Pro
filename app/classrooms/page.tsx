"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ref, onValue, push, set, get } from "firebase/database"
import { db } from "@/lib/firebase"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, Save, ArrowLeft, Package } from "lucide-react"
import Link from "next/link"

interface Program {
  id: string
  name: string
  version: string
}

function ClassroomContent() {
  const searchParams = useSearchParams()
  const classId = searchParams.get("id")
  
  const [className, setClassName] = useState("Yükleniyor...")
  
  // Programs State
  const [programs, setPrograms] = useState<Program[]>([])
  const [newProgramName, setNewProgramName] = useState("")
  const [newProgramVersion, setNewProgramVersion] = useState("")
  const [addingProgram, setAddingProgram] = useState(false)

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
      if (snapshot.exists()) setClassName(snapshot.val().name)
      else setClassName("Bulunamadı")
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

    return () => {
      unsubPrograms()
      unsubNotes()
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
    <div className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
      <header className="mb-8">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Dashboard'a Dön
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Sınıf: {className}</h1>
        <p className="text-muted-foreground">Yüklü programları ve teknik notları yönetin.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sol Kolon: Programlar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Yüklü Programlar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="flex gap-2" onSubmit={handleAddProgram}>
                <Input 
                  placeholder="Program Adı" 
                  value={newProgramName} 
                  onChange={(e) => setNewProgramName(e.target.value)} 
                />
                <Input 
                  placeholder="Sürüm (Opsiyonel)" 
                  className="w-1/3"
                  value={newProgramVersion} 
                  onChange={(e) => setNewProgramVersion(e.target.value)} 
                />
                <Button type="submit" disabled={addingProgram || !newProgramName.trim()} size="icon">
                  {addingProgram ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </form>

              <div className="border rounded-md divide-y">
                {programs.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Henüz program eklenmemiş.</div>
                ) : (
                  programs.map(p => (
                    <div key={p.id} className="p-3 flex justify-between items-center bg-card/50">
                      <span className="font-medium">{p.name}</span>
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
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Teknik Notlar</CardTitle>
              <Button variant="outline" size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
                {savingNotes ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Kaydet
              </Button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-2">
              <Textarea 
                placeholder="Bu sınıftaki bilgisayarlar hakkında teknik notlar alın (Örn: PC-5'in klavyesi arızalı...)" 
                className="flex-1 min-h-[300px] resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              {lastSaved && (
                <p className="text-xs text-right text-muted-foreground">
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
