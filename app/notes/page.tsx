"use client"

import { useEffect, useState } from "react"
import { ref, onValue, set } from "firebase/database"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loader2, Save, StickyNote } from "lucide-react"

import { AuthGuard } from "@/components/auth-guard"

export default function NotesPage() {
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const notesRef = ref(db, "admin_notes/main")
    const unsubscribe = onValue(notesRef, (snapshot) => {
      if (snapshot.exists()) {
        setNotes(snapshot.val().content || "")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleSaveNotes = async () => {
    setSaving(true)
    try {
      await set(ref(db, "admin_notes/main"), {
        content: notes,
        updatedAt: new Date().toISOString()
      })
      setLastSaved(new Date())
    } catch (error) {
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthGuard>
      <div className="flex-1 p-4 md:p-8 lg:p-10 max-w-5xl mx-auto w-full flex flex-col min-h-[calc(100vh-4rem)] lg:min-h-screen">
        {loading ? (
          <div className="flex-1 flex justify-center items-center">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          <>
            <header className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary shadow-primary/20 drop-shadow-sm">Kişisel Notlarım</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">Tüm sistem ve genel işlemler hakkında notlar alın.</p>
            </header>

            <Card className="flex-1 flex flex-col min-h-[50vh] border-primary/30 shadow-lg shadow-primary/10 bg-card/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/50 bg-muted/20">
                <CardTitle className="flex items-center gap-2 text-primary text-base md:text-lg">
                  <StickyNote className="h-5 w-5" />
                  Genel Notlar
                </CardTitle>
                <Button variant="default" onClick={handleSaveNotes} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-all duration-300">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Kaydet
                </Button>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-2 p-0">
                <Textarea 
                  placeholder="Kendinize dair genel notlar, yapılacaklar listesi veya hatırlatıcılar..." 
                  className="flex-1 min-h-[300px] md:min-h-[400px] resize-none text-base p-4 md:p-6 leading-relaxed focus-visible:ring-primary/50 border-0 rounded-none bg-transparent"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                {lastSaved && (
                  <div className="px-4 pb-4 md:px-6 md:pb-6 mt-auto">
                    <p className="text-xs text-right text-muted-foreground font-medium">
                      Son kaydetme: {lastSaved.toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AuthGuard>
  )
}
