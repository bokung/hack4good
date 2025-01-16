import { useState } from 'react'

function useTasks() {
  const [tasks, setTasks] = useState([])

  const addTask = (description, assignedTo, dueDate) => {
    const newTask = {
      id: Math.random().toString(36).substr(2, 9),
      description,
      assignedTo,
      dueDate,
      completed: false,
    }
    setTasks(prev => [...prev, newTask])
  }

  const completeTask = (taskId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true } : t))
  }

  return {
    tasks,
    addTask,
    completeTask,
  }
}

export default useTasks
