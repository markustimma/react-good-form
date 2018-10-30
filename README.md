# Declarative Components

Declarative Components for React.

## Installation

```
npm install declarative-components
```

## Why?

### Cohesive UI:s

Easily compose complex UI:s with declarative components. Instead of storing the state in the component the state is stored internally inside the declarative components. This way a change to variable is reflected only to children without the need to re-render the whole root component.

```JSX
import { Async, Sync } from "declarative-components"

const App = () => (
  <div>
    <h1>Welcome to my photos</h1>
    <Async.Const getter={() => Async.GET("https://jsonplaceholder.typicode.com/photos")}>
      {photos => (
        <div>
          <h2>I have {photos.length} photos in total</h2>
          <Sync.Var initialValue={10}>
            {(numberOfPhotos, setNumberOfPhotos) => (
              <Fragment>
                <div>
                  <button
                    onClick={() => {
                      setNumberOfPhotos(numberOfPhotos + 1)
                    }}
                  >
                    Show more
                  </button>
                </div>
                {photos.slice(0, numberOfPhotos).map(photo => (
                  <Sync.Var key={photo.id} initialValue={100}>
                    {(width, setWidth) => (
                      <img
                        onClick={() => {
                          setWidth(width + 10)
                        }}
                        width={width}
                        src={photo.url}
                      />
                    )}
                  </Sync.Var>
                ))}
              </Fragment>
            )}
          </Sync.Var>
        </div>
      )}
    </Async.Const>
  </div>
)
```

To accomplish this kind of behavior in the traditional React style we would have to create stateful subcomponents for rendering the photo and also for rendering the list.

```JSX
import { Async } from "declarative-components"

class Photo extends React.Component {
  state = {
    width: this.props.initialWidth
  }
  increaseWidth = () => {
    this.setState(({ width }) => {
      return {
        width: width + 10
      }
    })
  }
  render() {
    return <img onClick={this.increaseWidth} width={this.state.width} src={this.props.src} />
  }
}
class PhotoList extends React.Component {
  state = {
    numberOfPhotos: this.props.initialNumberOfPhotos
  }
  increaseNumberOfPhotos = () => {
    this.setState(({ numberOfPhotos }) => {
      return {
        numberOfPhotos: numberOfPhotos + 1
      }
    })
  }
  render() {
    return (
      <div>
        <button onClick={this.increaseNumberOfPhotos}>Show more</button>
        {this.props.photos.slice(0, this.state.numberOfPhotos).map(photo => (
          <Photo src={photo.url} key={photo.id} initialWidth={100} />
        ))}
      </div>
    )
  }
}

class App extends React.Component {
  state = { photos: null }
  render() {
    return (
      <div>
        <h1>Welcome to my photos</h1>
        {this.state.photos != null && (
          <div>
            <h2>I have {this.state.photos.length} photos in total</h2>
            <PhotoList photos={this.state.photos} initialNumberOfPhotos={100} />
          </div>
        )}
      </div>
    )
  }
  componentDidMount() {
    Async.GET("https://jsonplaceholder.typicode.com/photos").then(photos => {
      this.setState({ photos })
    })
  }
}
export default App
```

Certainly there is nothing wrong with this type of division of logic to smaller components and some might even prefer it this way. With declarative approach the code is more condensed and the behavior of the component is more clear at a glance.

And actually in the above case the `h1` header is still rendered twice versus the declarative approach where it is only rendered once.

### Optimizable

Now someone would say that it's easy to optimize the traditional React approach by making the `Photo` component a `PureComponent` to avoid the full render of the list every time that the `numberOfPhotos` is changed. This same optimization can be achieved with declarative components by using the `Sync.PureVar` component. An additional prop `injections` is provided. `Sync.PureVar` will perfom a shallow comparison on the injections prop (In the same way as props are compared in PureComponent) to decide whether it is necessary to render again or not. Injections are injected to the children function.

```JSX
import { Sync, Async, Form } from "declarative-components"

const photoChild = (width, setWidth, { photo }) => (
  <img
    onClick={() => {
      setWidth(width + 10)
    }}
    width={width}
    src={photo.url}
  />
)

const App = () => (
  <div>
    <h1>Welcome to my photos</h1>
    <Async.Const getter={() => Async.GET("https://jsonplaceholder.typicode.com/photos")}>
      {photos => (
        <div>
          <Sync.Var initialValue={10}>
            {(numberOfPhotos, setNumberOfPhotos) => (
              <Fragment>
                <div>
                  <button
                    onClick={() => {
                      setNumberOfPhotos(numberOfPhotos + 1)
                    }}
                  >
                    Show more
                  </button>
                </div>
                {photos.slice(0, numberOfPhotos).map(photo => (
                  <Sync.PureVar children={photoChild} injections={{ photo }} key={photo.id} initialValue={100} />
                ))}
              </Fragment>
            )}
          </Sync.Var>
        </div>
      )}
    </Async.Const>
  </div>
)
```

It is a good idea to declare the function for the optimized context outside the class scope to avoid capturing variables from upper scopes. Otherwise it is easy to run into bugs since the children function is not re-called unless injections or value are changed .

### Drop-In Asynchronous

Asynchronous `Var` and `Const` components let you define getters and setters (`Var`) as Promises. 

```JSX
import { Sync, Async, Form } from "declarative-components"

const App = () => (
  <Sync.Var initialValue={1}>
    {(todoId, setTodoId) => (
      <Fragment>
        <h1>
          Edit todo {todoId}{" "}
          <button
            onClick={() => {
              setTodoId(todoId + 1)
            }}
          >
            Next
          </button>
        </h1>
        <Async.Var
          onValueSet={todo => {
            alert(`Todo ${todo.id} saved`)
          }}
          setter={value => Async.PUT("https://jsonplaceholder.typicode.com/todos/" + todoId, value)}
          getter={() => Async.GET("https://jsonplaceholder.typicode.com/todos/" + todoId)}
        >
          {(todo, progress, updateTodo, asyncType) => (
            <p
              style={{
                opacity: Async.isLoading(progress, asyncType) ? 0.5 : 1
              }}
            >
              <Form value={todo} onChange={updateTodo}>
                {({ Root }) => (
                  <Fragment>
                    <Root>
                      {({ Input, Validation }) => (
                        <Fragment>
                          <Input type="checkbox" name="completed" />
                          <Validation for="title">
                            {validation => (
                              <span style={{ color: validation ? "red" : undefined }}>
                                <label>Todo title</label>
                                <Input minLength={3} notEmpty={true} maxLength={100} name="title" />
                              </span>
                            )}
                          </Validation>
                        </Fragment>
                      )}
                    </Root>
                    <button type="submit" disabled={progress === Async.Progress.Progressing}>
                      Save Todo
                    </button>
                  </Fragment>
                )}
              </Form>
            </p>
          )}
        </Async.Var>
      </Fragment>
    )}
  </Sync.Var>
)
```

## Examples

### DataTable

```JSX
import React, { Fragment } from "react"

import { DataTable, Sync, Async } from "declarative-components"
const colors = ["red", "green", "blue", "yellow"] as ("red" | "green" | "blue" | "yellow")[]

interface Photo {
  albumId: number
  id: number
  title: string
  url: string
  thumbnailUrl: string
}

class App extends React.Component {
  public render() {
    return (
      <Async.Const value={Async.GET<Photo[]>("https://jsonplaceholder.typicode.com/photos")}>
        {photos => (
          <Sync.Var initialValue={colors[0]}>
            {(color, setColor) => (
              <Fragment>
                <nav>
                  <select
                    value={color}
                    onChange={(e: any) => {
                      setColor(e.target.value)
                    }}
                  >
                    {colors.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </nav>
                <DataTable data={photos} rowHeight={18} anticipateRows={70} initialSortField={"title"}>
                  {({ THead, TBody, Sort }, queryString, setQueryString) => {
                    return (
                      <table>
                        <input
                          placeholder="search"
                          value={queryString}
                          onChange={(e: any) => {
                            setQueryString(e.target.value)
                          }}
                        />
                        <THead>
                          <tr style={{ color }}>
                            <Sort field="title">
                              {(sortDirection, toggleSort) => (
                                <th
                                  style={{ textAlign: "left", cursor: "pointer", whiteSpace: "nowrap" }}
                                  onClick={toggleSort}
                                >
                                  Title {sortDirection === "desc" ? "⬇" : sortDirection === "asc" ? "⬆" : "⬍"}
                                </th>
                              )}
                            </Sort>
                            <th style={{ textAlign: "left" }}>id</th>
                            <th style={{ textAlign: "left" }}>AlbumId</th>
                            <th>Url</th>
                          </tr>
                        </THead>
                        <TBody>
                          {photo => (
                            <Fragment>
                              <DataTable.Td>{photo.title}</DataTable.Td>
                              <DataTable.Td>{photo.id}</DataTable.Td>
                              <DataTable.Td>{photo.albumId}</DataTable.Td>
                              <DataTable.Td>{photo.url}</DataTable.Td>
                            </Fragment>
                          )}
                        </TBody>
                      </table>
                    )
                  }}
                </DataTable>
              </Fragment>
            )}
          </Sync.Var>
        )}
      </Async.Const>
    )
  }
}
```

### Form

Form is a controlled component that calls onChange on every form submit. Form supports validation.

```JSX
import React, { Fragment } from "react"
import { Form, Async, Sync } from "declarative-components"

interface Post {
  userId: number
  id: number
  title: string
  body: string
}

class App extends React.Component {
  public render() {
    return (
      <Sync.Var initialValue={"edit" as "edit" | "done"}>
        {(tab, setTab) => (
          <Fragment>
            {tab === "edit" && (
              <Async.Var
                onChanged={() => {
                  setTimeout(() => {
                    setTab("done")
                  }, 2000)
                }}
                setter={value => {
                  if (value) {
                    return {
                      operation: Async.PUT<Async.Model.Incomplete<Post>>(
                        "https://jsonplaceholder.typicode.com/posts/1",
                        value
                      ),
                      type: Async.Type.Update
                    }
                  } else {
                    return {
                      operation: Async.DELETE(`https://jsonplaceholder.typicode.com/posts/1`),
                      type: Async.Type.Delete
                    }
                  }
                }}
                initialValue={Async.GET<Post>("https://jsonplaceholder.typicode.com/posts/1")}
              >
                {(post, asyncState, setValue) => (
                  <p style={{ opacity: asyncState.progress === Async.Progress.Progressing ? 0.5 : 1 }}>
                    <Sync.Var initialValue={5}>
                      {(minLength, setMinLength) => (
                        <Fragment>
                          <p>
                            <label>Set min length</label>
                            <input
                              type="number"
                              value={minLength}
                              onChange={(e: any) => {
                                setMinLength(e.target.value)
                              }}
                            />
                          </p>
                          <Form
                            value={post}
                            onChange={value => {
                              setValue(value)
                            }}
                          >
                            {({ Root, SubmitButton }) => (
                              <Fragment>
                                <Root>
                                  {({ Validation, Input, TextArea }, __, onChange) => (
                                    <Fragment>
                                      <Validation for="id">
                                        {invalid => (
                                          <div style={{ color: invalid ? "red" : undefined }}>
                                            <label>Id</label>
                                            <Input
                                              type="number"
                                              onChange={(e: any) => {
                                                onChange({ id: parseInt(e.target.value, 10) })
                                              }}
                                              min={2}
                                              max={50}
                                              name="id"
                                            />
                                          </div>
                                        )}
                                      </Validation>
                                      <Validation for="userId">
                                        {invalid => (
                                          <div style={{ color: invalid ? "red" : undefined }}>
                                            <label>userId</label>
                                            <Input
                                              type="number"
                                              onChange={(e: any) => {
                                                onChange({ userId: parseInt(e.target.value, 10) })
                                              }}
                                              min={0}
                                              name="userId"
                                            />
                                          </div>
                                        )}
                                      </Validation>
                                      <Validation for="title">
                                        {invalid => (
                                          <div style={{ color: invalid ? "red" : undefined }}>
                                            <label>Title</label>
                                            <Input notEmpty={true} minLength={minLength} maxLength={40} name="title" />
                                          </div>
                                        )}
                                      </Validation>
                                      <Validation for="body">
                                        {invalid => (
                                          <div style={{ color: invalid ? "red" : undefined }}>
                                            <label>Body</label>
                                            <TextArea notEmpty={true} rows={5} maxLength={400} name="body" />
                                          </div>
                                        )}
                                      </Validation>
                                      <table>
                                        <thead>
                                          <tr>
                                            <th>Field name</th>
                                            {_.keys(formRules).map(ruleName => (
                                              <th>{ruleName}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {_.map(post, (__, key) => (
                                            <tr key={key}>
                                              <Validation for={key as keyof Post}>
                                                {invalid => (
                                                  <Fragment>
                                                    <th>{key}</th>
                                                    {_.keys(formRules).map(ruleKey => {
                                                      return (
                                                        <th key={ruleKey}>
                                                          {invalid && invalid[ruleKey as keyof typeof formRules] ? (
                                                            <span style={{ color: "red" }}>
                                                              ✕{" "}
                                                              <sub>
                                                                {invalid[ruleKey as keyof typeof formRules]!.ruleValue}
                                                              </sub>
                                                            </span>
                                                          ) : (
                                                            <span style={{ color: "green" }}>✔</span>
                                                          )}
                                                        </th>
                                                      )
                                                    })}
                                                  </Fragment>
                                                )}
                                              </Validation>
                                              <th />
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </Fragment>
                                  )}
                                </Root>
                                <SubmitButton asyncDataType={Async.Type.Update} progress={Async.Progress.Normal} />
                              </Fragment>
                            )}
                          </Form>
                        </Fragment>
                      )}
                    </Sync.Var>
                  </p>
                )}
              </Async.Var>
            )}
            {tab === "done" && <p>Edit success</p>}
          </Fragment>
        )}
      </Sync.Var>
    )
  }
}
```

## Acknowledgements

Library boilerplate starter: https://github.com/alexjoverm/typescript-library-starter

## Dependencies
