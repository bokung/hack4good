import { useState } from 'react'
import { Task } from '../types'

function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])

  const addTask = (description: string, assignedTo: string, dueDate: string) => {
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      description,
      assignedTo,
      dueDate,
      completed: false,
    }
    setTasks(prev => [...prev, newTask])
  }

  const completeTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true } : t))
  }

  return {
    tasks,
    addTask,
    completeTask,
  }
}

export default useTasks
