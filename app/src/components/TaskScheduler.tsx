import * as React from 'react'
import { useState } from 'react'
import useTasks from '../hooks/useTasks'

function TaskScheduler() {
  const { tasks, addTask, completeTask } = useTasks()
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')

  const handleAddTask = () => {
    addTask(description, assignedTo, dueDate)
    setDescription('')
    setAssignedTo('')
    setDueDate('')
  }

  return (
    <div style={{ border: '1px solid #ddd', padding: '1rem' }}>
      <h2>Task Scheduler</h2>
      <div>
        <label>Task Description:</label><br/>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>
      <div>
        <label>Assigned To (email or name):</label><br/>
        <input
          type="text"
          value={assignedTo}
          onChange={e => setAssignedTo(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>
      <div>
        <label>Due Date:</label><br/>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>
      <button onClick={handleAddTask}>Add Task</button>

      <h3>Pending Tasks</h3>
      <ul>
        {tasks.map(task => (
          !task.completed && (
            <li key={task.id} style={{ marginTop: '0.5rem' }}>
              <strong>{task.description}</strong> assigned to {task.assignedTo} (due {task.dueDate})
              <button onClick={() => completeTask(task.id)} style={{ marginLeft: '1rem' }}>
                Mark Complete
              </button>
            </li>
          )
        ))}
      </ul>

      <h3>Completed Tasks</h3>
      <ul>
        {tasks.map(task => (
          task.completed && (
            <li key={task.id}>
              <s>{task.description}</s> (completed)
            </li>
          )
        ))}
      </ul>
    </div>
  )
}

export default TaskScheduler
