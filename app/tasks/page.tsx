"use client"

import { useEffect, useState } from "react"
import { ref, onValue, push, set, remove } from "firebase/database"
import { db } from "@/lib/firebase"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, CheckCircle2, Circle, Trash2, Calendar, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"

interface Task {
  id: string
  text: string
  status: "pending" | "completed"
  createdAt: string
  completedAt?: string
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskText, setNewTaskText] = useState("")
  const [loading, setLoading] = useState(true)
  const [addingTask, setAddingTask] = useState(false)

  useEffect(() => {
    const tasksRef = ref(db, "tasks")
    const unsubscribe = onValue(tasksRef, (snapshot) => {
      const taskList: Task[] = []
      snapshot.forEach((child) => {
        taskList.push({ id: child.key, ...child.val() } as Task)
      })
      // Sort tasks: pending first, then by date
      taskList.sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === "pending" ? -1 : 1
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      setTasks(taskList)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskText.trim()) return

    setAddingTask(true)
    try {
      const tasksRef = ref(db, "tasks")
      const newTaskRef = push(tasksRef)
      await set(newTaskRef, {
        text: newTaskText.trim(),
        status: "pending",
        createdAt: new Date().toISOString()
      })
      setNewTaskText("")
    } catch (error) {
      console.error("Error adding task:", error)
    } finally {
      setAddingTask(false)
    }
  }

  const toggleTaskStatus = async (task: Task) => {
    try {
      const newStatus = task.status === "pending" ? "completed" : "pending"
      const taskRef = ref(db, `tasks/${task.id}`)
      await set(taskRef, {
        ...task,
        status: newStatus,
        completedAt: newStatus === "completed" ? new Date().toISOString() : null
      })
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      await remove(ref(db, `tasks/${taskId}`))
    } catch (error) {
      console.error("Error deleting task:", error)
    }
  }

  const pendingTasks = tasks.filter(t => t.status === "pending")
  const completedTasks = tasks.filter(t => t.status === "completed")

  return (
    <AuthGuard>
      <div className="flex-1 p-4 md:p-8 lg:p-10 max-w-4xl mx-auto w-full flex flex-col min-h-screen">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-primary shadow-primary/20 drop-shadow-sm flex items-center gap-3">
            <ClipboardList className="h-8 w-8" />
            Yapılacak İşler
          </h1>
          <p className="text-muted-foreground mt-2">
            Günlük görevlerinizi takip edin. Bekleyen işleriniz için telefonunuza her 10 dakikada bir bildirim gelecektir.
          </p>
        </header>

        <section className="mb-8 p-6 border border-primary/20 rounded-xl bg-card/50 backdrop-blur-sm shadow-xl shadow-primary/5">
          <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleAddTask}>
            <Input
              placeholder="Yeni bir iş ekleyin... (Örn: PC-10 Format atılacak)"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              className="flex-1 text-base h-12 border-primary/20 focus-visible:ring-primary/40"
            />
            <Button 
              type="submit" 
              disabled={addingTask || !newTaskText.trim()} 
              className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(var(--primary),0.3)] transition-all"
            >
              {addingTask ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5 mr-2" />}
              {addingTask ? "Ekleniyor..." : "Ekle"}
            </Button>
          </form>
        </section>

        {loading ? (
          <div className="flex-1 flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-10">
            {/* Bekleyen İşler */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 px-1">
                <Circle className="h-5 w-5 text-yellow-500 fill-yellow-500/10" />
                Bekleyen İşler ({pendingTasks.length})
              </h2>
              <div className="grid gap-3">
                {pendingTasks.length === 0 ? (
                  <Card className="border-dashed border-2 bg-muted/20">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      Tüm işler tamamlandı! Harika gidiyorsun.
                    </CardContent>
                  </Card>
                ) : (
                  pendingTasks.map((task) => (
                    <Card key={task.id} className="group hover:border-primary/40 transition-all bg-card/80">
                      <CardContent className="p-4 flex items-center gap-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-full hover:bg-green-500/10 hover:text-green-500 text-muted-foreground transition-colors"
                          onClick={() => toggleTaskStatus(task)}
                        >
                          <Circle className="h-6 w-6" />
                        </Button>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium leading-tight truncate">{task.text}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.createdAt).toLocaleDateString()} {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Tamamlanan İşler */}
            {completedTasks.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 px-1 text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Tamamlanan İşler ({completedTasks.length})
                </h2>
                <div className="grid gap-3">
                  {completedTasks.map((task) => (
                    <Card key={task.id} className="bg-muted/30 border-muted opacity-80">
                      <CardContent className="p-4 flex items-center gap-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-full text-green-500 hover:text-green-600 hover:bg-green-500/5 transition-colors"
                          onClick={() => toggleTaskStatus(task)}
                        >
                          <CheckCircle2 className="h-6 w-6" />
                        </Button>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium line-through text-muted-foreground decoration-2">{task.text}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Tamamlanma: {new Date(task.completedAt!).toLocaleDateString()}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground/50 hover:text-destructive"
                          onClick={() => deleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
