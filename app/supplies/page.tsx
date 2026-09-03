"use client"

import { useEffect, useState } from "react"
import { ref, onValue, push, set, remove } from "firebase/database"
import { db } from "@/lib/firebase"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Calendar, 
  PackageCheck, 
  Boxes, 
  Search, 
  Filter, 
  School, 
  Tag, 
  ArrowRight
} from "lucide-react"
import Link from "next/link"

interface Classroom {
  id: string
  name: string
  location?: string
}

export interface SupplyItem {
  id: string
  classId: string
  className: string
  classLocation?: string
  itemName: string
  quantity: number
  category?: string
  notes?: string
  date: string
  addedBy?: string
  createdAt: string
}

const CATEGORIES = [
  "Donanım & Parça (RAM, SSD vb.)",
  "Çevre Birimi (Klavye, Mouse, Kulaklık)",
  "Kablo & Adaptör (HDMI, Güç vb.)",
  "Ağ & Network (Switch, Router, RJ45)",
  "Görüntü & Ses (Projeksiyon, Hoparlör)",
  "Sarf Malzeme (Toner, Kağıt, Pil)",
  "Diğer / Genel"
]

export default function SuppliesPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [supplies, setSupplies] = useState<SupplyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [selectedClassId, setSelectedClassId] = useState("")
  const [itemName, setItemName] = useState("")
  const [quantity, setQuantity] = useState<number>(1)
  const [category, setCategory] = useState(CATEGORIES[0])
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("")
  const [filterClassId, setFilterClassId] = useState("ALL")
  const [filterCategory, setFilterCategory] = useState("ALL")

  useEffect(() => {
    // 1. Fetch Classrooms
    const classesRef = ref(db, "classrooms")
    const unsubClasses = onValue(classesRef, (snapshot) => {
      const list: Classroom[] = []
      snapshot.forEach((child) => {
        list.push({ id: child.key, ...child.val() } as Classroom)
      })
      list.sort((a, b) => a.name.localeCompare(b.name, "tr"))
      setClassrooms(list)
    })

    // 2. Fetch Supplies
    const suppliesRef = ref(db, "classroom_supplies")
    const unsubSupplies = onValue(suppliesRef, (snapshot) => {
      const list: SupplyItem[] = []
      snapshot.forEach((child) => {
        list.push({ id: child.key, ...child.val() } as SupplyItem)
      })
      // Sort by newest date / creation first
      list.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
      setSupplies(list)
      setLoading(false)
    })

    return () => {
      unsubClasses()
      unsubSupplies()
    }
  }, [])

  const handleAddSupply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClassId || !itemName.trim()) return

    const targetClass = classrooms.find((c) => c.id === selectedClassId)
    const className = targetClass ? targetClass.name : "Bilinmeyen Sınıf"
    const classLocation = targetClass?.location || ""
    const currentUsername = typeof window !== "undefined" ? localStorage.getItem("currentUsername") || "Yetkili" : "Yetkili"

    setSubmitting(true)
    try {
      const newRef = push(ref(db, "classroom_supplies"))
      await set(newRef, {
        classId: selectedClassId,
        className,
        classLocation,
        itemName: itemName.trim(),
        quantity: Number(quantity) || 1,
        category: category || "Genel",
        notes: notes.trim() || "",
        date: date || new Date().toISOString().split("T")[0],
        addedBy: currentUsername,
        createdAt: new Date().toISOString()
      })

      // Reset form
      setItemName("")
      setQuantity(1)
      setNotes("")
    } catch (error) {
      console.error("Error adding supply:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Bu alım kaydını silmek istediğinizden emin misiniz?")) {
      try {
        await remove(ref(db, `classroom_supplies/${id}`))
      } catch (error) {
        console.error("Error deleting supply:", error)
      }
    }
  }

  // Filtered supplies
  const filteredSupplies = supplies.filter((item) => {
    const matchesSearch =
      item.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.className?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesClass = filterClassId === "ALL" || item.classId === filterClassId
    const matchesCategory = filterCategory === "ALL" || item.category === filterCategory

    return matchesSearch && matchesClass && matchesCategory
  })

  // Statistics
  const totalItemsCount = supplies.reduce((acc, curr) => acc + (Number(curr.quantity) || 1), 0)
  const uniqueClassesCount = new Set(supplies.map((s) => s.classId)).size

  return (
    <AuthGuard>
      <div className="flex-1 p-4 md:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
              <PackageCheck className="h-8 w-8" />
              Sınıf Alımları & Zimmet Takibi
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Hangi sınıfa hangi donanım, aparat veya malzemenin alındığını kaydedin ve listeleyin.
            </p>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card/60 backdrop-blur-sm border-primary/20 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Toplam Alınan Adet</p>
                <h3 className="text-2xl font-bold mt-1 text-primary">{totalItemsCount}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Boxes className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm border-primary/20 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Toplam İşlem Kaydı</p>
                <h3 className="text-2xl font-bold mt-1">{supplies.length}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Tag className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm border-primary/20 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Donatılan Sınıf Sayısı</p>
                <h3 className="text-2xl font-bold mt-1">{uniqueClassesCount} / {classrooms.length}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <School className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Yeni Alım / Malzeme Ekleme Kartı */}
        <Card className="border-primary/30 shadow-md bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <Plus className="h-5 w-5" />
              Yeni Sınıf Alımı / Malzeme Kaydı Ekle
            </CardTitle>
            <CardDescription>
              Bir sınıfa yeni bir ekipman veya sarf malzeme teslim edildiğinde buraya kaydedin.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleAddSupply} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Sınıf Seçimi */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                    <School className="h-3.5 w-3.5 text-primary" /> Hedef Sınıf *
                  </label>
                  <select
                    required
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="">Sınıf Seçiniz</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.location ? `(${c.location})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Malzeme Adı */}
                <div className="space-y-1.5 lg:col-span-2">
                  <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-primary" /> Alınan Malzeme / Ürün Adı *
                  </label>
                  <Input
                    required
                    placeholder="Örn: Logitech MK120 Klavye Seti, 10m HDMI Kablosu..."
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Adet / Miktar */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80">Adet / Miktar *</label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-10"
                  />
                </div>

                {/* Kategori */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tarih */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Alım Tarihi
                  </label>
                  <Input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Not / Açıklama */}
                <div className="space-y-1.5 lg:col-span-2">
                  <label className="text-xs font-semibold text-foreground/80">Açıklama / Notlar (Opsiyonel)</label>
                  <Input
                    placeholder="Örn: Hoca masasına bağlandı, 3 yıl garantili, kutusu dolapta..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={submitting || !selectedClassId || !itemName.trim()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(var(--primary),0.3)] transition-all px-6"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" /> Kaydı Ekle
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Filtreleme ve Liste Bölümü */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Malzeme, sınıf veya not ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(e.target.value)}
                  className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-48 cursor-pointer"
                >
                  <option value="ALL">Tüm Sınıflar ({classrooms.length})</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-48 cursor-pointer"
              >
                <option value="ALL">Tüm Kategoriler</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : filteredSupplies.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                <Boxes className="h-12 w-12 text-muted-foreground/40" />
                <div>
                  <p className="font-semibold text-base">Kayıt Bulunamadı</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {supplies.length === 0
                      ? "Henüz herhangi bir sınıfa alım/malzeme kaydı yapılmamış. Yukarıdaki formu kullanarak ilk kaydı ekleyin."
                      : "Arama veya filtre kriterlerinize uygun kayıt bulunamadı."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSupplies.map((item) => (
                <Card
                  key={item.id}
                  className="group hover:border-primary/50 transition-all bg-card/90 shadow-sm flex flex-col justify-between"
                >
                  <CardHeader className="pb-3 pt-4 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link 
                          href={`/classrooms?id=${item.classId}`}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors mb-2"
                        >
                          <School className="h-3 w-3" />
                          <span>{item.className}</span>
                          {item.classLocation && (
                            <span className="text-[10px] opacity-75">({item.classLocation})</span>
                          )}
                          <ArrowRight className="h-3 w-3 ml-0.5 opacity-60" />
                        </Link>
                        <h3 className="font-semibold text-base text-foreground leading-snug line-clamp-2">
                          {item.itemName}
                        </h3>
                      </div>
                      <span className="shrink-0 font-bold text-sm bg-muted px-2.5 py-1 rounded-md border border-border">
                        {item.quantity} Adet
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="px-4 pb-4 pt-0 space-y-3">
                    {item.category && (
                      <div className="inline-block">
                        <span className="text-[11px] text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded border border-secondary">
                          {item.category}
                        </span>
                      </div>
                    )}

                    {item.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-md border border-border/40 italic">
                        "{item.notes}"
                      </p>
                    )}

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(item.date).toLocaleDateString("tr-TR")}
                      </span>

                      <div className="flex items-center gap-2">
                        {item.addedBy && (
                          <span className="text-[11px] text-muted-foreground/80">
                            {item.addedBy}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => handleDelete(item.id)}
                          title="Kaydı Sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
