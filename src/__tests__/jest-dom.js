import React from 'react'
import ReactDOM from 'react-dom'
import {FavoriteNumber} from '../favorite-number'

test('renders a number input with label "fav number', () => {
  const div = document.createElement('div')
  ReactDOM.render(<FavoriteNumber />, div)
  expect(div.querySelector('input')).toHaveAttribute('type', 'number')
  expect(div.querySelector('label')).toHaveTextContent('Favorite Number')
})
