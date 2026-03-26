"use client"

import { useEffect, useState } from "react"
import { ref, onValue } from "firebase/database"
import { db } from "@/lib/firebase"
import { Capacitor } from "@capacitor/core"
import { LocalNotifications } from "@capacitor/local-notifications"

export function useTaskNotifications() {
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    // 1. Firebase Listener
    const tasksRef = ref(db, "tasks")
    const unsubscribe = onValue(tasksRef, (snapshot) => {
      let count = 0
      snapshot.forEach((child) => {
        if (child.val().status === "pending") {
          count++
        }
      })
      setPendingCount(count)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    const manageNotifications = async () => {
      // Setup Native Notifications
      if (Capacitor.isNativePlatform()) {
        try {
          const perm = await LocalNotifications.requestPermissions()
          if (perm.display !== "granted") return

          if (pendingCount > 0) {
            // Schedule repeating notifications every 10 minutes
            // Capacitor doesn't have an "every 10 minutes" interval directly,
            // so we schedule 6 notifications at specific minutes of every hour.
            const notificationsToSchedule = [0, 10, 20, 30, 40, 50].map((min, idx) => ({
              title: "Bekleyen İşiniz Var!",
              body: `Yapmanız gereken ${pendingCount} adet bekleyen işiniz var. Kontrol etmeyi unutmayın.`,
              id: 100 + idx, // IDs 100-105 reserved for task notifications
              schedule: {
                repeats: true,
                allowWhileIdle: true,
                on: { minute: min },
              },
            }))

            // Clear old ones first to prevent duplicates, then set new ones
            await LocalNotifications.cancel({
              notifications: [0, 10, 20, 30, 40, 50].map((_, idx) => ({ id: 100 + idx }))
            })
            await LocalNotifications.schedule({ notifications: notificationsToSchedule })
          } else {
            // Cancel if there are no tasks
            await LocalNotifications.cancel({
              notifications: [0, 10, 20, 30, 40, 50].map((_, idx) => ({ id: 100 + idx }))
            })
          }
        } catch (error) {
          console.error("Native notification error:", error)
        }
      } 
      // Setup Web Fallback for Desktop usage / Dev
      else {
        if ("Notification" in window) {
          if (Notification.permission !== "granted") {
            await Notification.requestPermission()
          }
          if (Notification.permission === "granted") {
            if (pendingCount > 0) {
              // Trigger one immediately
              new Notification("Bekleyen İşiniz Var!", {
                body: `Yapmanız gereken ${pendingCount} adet bekleyen işiniz var.`,
              })
              // Trigger every 10 minutes while app is open
              intervalId = setInterval(() => {
                new Notification("Bekleyen İşiniz Var!", {
                  body: `Yapmanız gereken ${pendingCount} adet bekleyen işiniz var.`,
                })
              }, 10 * 60 * 1000)
            }
          }
        }
      }
    }

    manageNotifications()

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [pendingCount])

  return pendingCount
}
