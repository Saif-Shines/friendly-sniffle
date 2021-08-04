import React from 'react'
import {render} from '@testing-library/react'
import {axe} from 'jest-axe'

function InaccessibleForm() {
  return (
    <form>
      <input placeholder="email" />
    </form>
  )
}

function AccessibleForm() {
  return (
    <form>
      <label htmlFor="username">Username</label>
      <input id="username" placeholder="username" />
    </form>
  )
}

test('inaccessible forms fail axe', async () => {
  const {container} = render(<InaccessibleForm />)
  expect(await axe(container)).not.toHaveNoViolations()
})

test('accessbile forms pass axe', async () => {
  const {container} = render(<AccessibleForm />)
  expect(await axe(container)).toHaveNoViolations()
})
