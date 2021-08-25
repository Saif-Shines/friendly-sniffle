import React from 'react'
import {createStore} from 'redux'
import {Provider} from 'react-redux'
import {render as rtlRender, fireEvent} from '@testing-library/react'
import {Counter} from '../redux-counter'
import {reducer} from '../redux-reducer'

function render(
  ui,
  {
    initialState,
    store = createStore(reducer, initialState),
    ...renderOptions
  } = {},
) {
  function Wrapper({children}) {
    return <Provider store={store}>{children}</Provider>
  }

  return {
    ...rtlRender(ui, {...renderOptions, wrapper: Wrapper}),
  }
}

test('can render redux with defaults', () => {
  const {getByLabelText, getByText} = render(<Counter />)
  fireEvent.click(getByText('+'))
  expect(getByLabelText('count')).toHaveTextContent('1')
})

test('can render with redux with custom initial state', () => {
  const {getByLabelText, getByText} = render(<Counter />, {
    initialState: {count: 3},
  })
  fireEvent.click(getByText('-'))
  expect(getByLabelText('count')).toHaveTextContent('2')
})
