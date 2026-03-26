"use client"

import { useEffect, useState } from "react"
import { ref, onValue, push, set } from "firebase/database"
import { db } from "@/lib/firebase"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Loader2, Plus, Monitor, LayoutList } from "lucide-react"
import Link from "next/link"

interface Classroom {
  id: string
  name: string
  location?: string
}

export default function Dashboard() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [newClassName, setNewClassName] = useState("")
  const [newClassLocation, setNewClassLocation] = useState("")
  const [addingClassroom, setAddingClassroom] = useState(false)

  useEffect(() => {
    const classroomsRef = ref(db, "classrooms")
    const unsubscribe = onValue(classroomsRef, (snapshot) => {
      const clsList: Classroom[] = []
      snapshot.forEach((childSnapshot) => {
        clsList.push({ id: childSnapshot.key, ...childSnapshot.val() } as Classroom)
      })
      setClassrooms(clsList)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleAddClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClassName.trim()) return

    setAddingClassroom(true)
    try {
      const newClassRef = push(ref(db, "classrooms"))
      await set(newClassRef, {
        name: newClassName.trim(),
        location: newClassLocation.trim() || "Kayıtsız Lokasyon"
      })
      setNewClassName("")
      setNewClassLocation("")
    } catch (error) {
      console.error("Error adding classroom: ", error)
    } finally {
      setAddingClassroom(false)
    }
  }

  // Group Classrooms by Location
  const groupedClassrooms = classrooms.reduce((acc, cls) => {
    const loc = cls.location || "Kayıtsız Lokasyon"
    if (!acc[loc]) acc[loc] = []
    acc[loc].push(cls)
    return acc
  }, {} as Record<string, Classroom[]>)

  return (
    <AuthGuard>
      <div className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Menü ve Sınıf Yönetimi</h1>
            <p className="text-muted-foreground">Sınıfları katlara (lokasyonlara) göre ekleyip inceleyebilirsiniz.</p>
          </div>
        </header>

        <section className="mb-10 p-5 border rounded-lg bg-card/50 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-muted-foreground">
            <Plus className="h-4 w-4" />
            Yeni Sınıf Ekle
          </div>
          <form className="grid grid-cols-1 sm:grid-cols-12 gap-4" onSubmit={handleAddClassroom}>
            <div className="sm:col-span-4">
              <Input
                placeholder="Sınıf Adı (Örn: A-101)"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
              />
            </div>
            <div className="sm:col-span-5">
              <Input
                placeholder="Bulunduğu Kat (Örn: 1. Kat, Zemin Kat)"
                value={newClassLocation}
                onChange={(e) => setNewClassLocation(e.target.value)}
              />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" className="w-full" disabled={addingClassroom || !newClassName.trim()}>
                {addingClassroom ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                {addingClassroom ? "Ekleniyor..." : "Sınıfı Oluştur"}
              </Button>
            </div>
          </form>
        </section>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : classrooms.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground border rounded-lg border-dashed">
            Henüz hiç sınıf eklenmemiş. Lütfen yukarıdan bir sınıf ekleyin.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
              <LayoutList className="h-5 w-5" />
              Sınıf Listesi (Katalara Göre)
            </div>
            
            {/* @ts-expect-error Shadcn Accordion type mismatch */}
            <Accordion type={"multiple" as any} className="w-full">
              {Object.entries(groupedClassrooms).map(([loc, classes]) => (
                <AccordionItem value={loc} key={loc} className="border bg-card/20 rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline hover:text-primary transition-colors py-4">
                    <span>{loc} <span className="text-sm font-normal text-muted-foreground ml-2">({classes.length} Sınıf)</span></span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2 pb-4">
                      {classes.map((cls) => (
                        <Link href={`/classrooms?id=${cls.id}`} key={cls.id}>
                          <Card className="hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer h-full">
                            <CardHeader className="pb-3 pt-4 px-4">
                              <CardTitle className="flex items-center gap-2 text-base">
                                <Monitor className="h-4 w-4 text-primary" />
                                {cls.name}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                              <div className="text-xs text-muted-foreground flex justify-between">
                                <span>Detay ve Notlar &rarr;</span>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
