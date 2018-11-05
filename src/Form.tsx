import * as React from 'react'
import * as _ from 'lodash'
import { formRules, ValidationRuleType, Validation } from './formrules'
const L: any = require('partial.lenses')

// just a random type name to avoid possible collisions

type ValidationRules = {
  [P in keyof typeof formRules]?: (typeof formRules)[P] extends ValidationRuleType<boolean>
    ? boolean
    : (typeof formRules)[P] extends ValidationRuleType<number>
      ? number
      : (typeof formRules)[P] extends ValidationRuleType<string> ? string : RegExp
}
export type ValidationGroup = { [K in keyof typeof formRules]?: Validation }

export type ErrorLabelProps<T> = React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
  name: keyof T
}
export type ValidationProps<T> = {
  for: keyof T
  children: (validation: ValidationGroup | null) => JSX.Element
}
export type TextAreaProps<T> = _.Omit<
  React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>,
  'ref'
> &
  ValidationRules & {
    name: keyof T
    value?: number | string | boolean
  }
export type InputProps<T> = _.Omit<
  React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
  'ref'
> &
  ValidationRules & {
    name: keyof T
    value?: number | string | boolean
  }

export interface FormSubScopePublicProps<T, S extends keyof T> {
  scope: S
}

export interface FormScopeSharedPublicProps<T> {
  optimized?: boolean
  children: (
    Scope: {
      Sub: <B extends keyof T>(
        props: FormSubScopePublicProps<T, B> & FormScopeSharedPublicProps<T[B]>
      ) => JSX.Element | null
      Input: (props: InputProps<T>) => JSX.Element
      TextArea: (props: TextAreaProps<T>) => JSX.Element
      Validation: (props: ValidationProps<T>) => JSX.Element
    },
    value: T,
    handleFieldChange: (e: FormEventType<T>) => void
  ) => JSX.Element | null
}

type LensPathType = (string | number)[]

type FormEventType<T> = T extends Array<infer G> ? { [K in keyof G]?: G[K] }[] : { [K in keyof T]?: T[K] }

export interface FormScopePrivateProps<T> {
  // not really used for anything, just here for type inference
  rootValue: T
  //
  value: any
  rules: any
  touched: any
  iteration: number
  setState: (newState: any) => void
  onInsertRule: (lensPath: LensPathType, rule: ValidationRules, ref: React.RefObject<HTMLInputElement>) => void
  onRemoveRule: (lensPath: LensPathType) => void
  touchField: (lensPath: LensPathType) => void
  unTouchField: (lensPath: LensPathType) => void
  lensPath: (string | number)[]
}

export interface FormProps<T>
  extends _.Omit<React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>, 'onChange'> {
  value: T
  onChange: (data: T) => void
  allowUndefinedPaths?: boolean
  children: (
    Form: {
      Root: (props: FormScopeSharedPublicProps<T>) => JSX.Element
    }
  ) => JSX.Element
}

class InputInner extends React.Component<
  React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>,
    HTMLInputElement | HTMLTextAreaElement
  > & {
    onDidMount: (ref: React.RefObject<any>) => void
    onWillUnmount: () => void
    _textArea: boolean
  }
> {
  ref = React.createRef<any>()
  render() {
    if (this.props._textArea) {
      return <textarea ref={this.ref as any} {..._.omit(this.props, ['onDidMount', 'onWillUnmount', '_textArea'])} />
    } else {
      return <input ref={this.ref as any} {..._.omit(this.props, ['onDidMount', 'onWillUnmount', '_textArea'])} />
    }
  }
  componentDidMount() {
    this.props.onDidMount(this.ref)
  }

  componentWillUnmount() {
    this.props.onWillUnmount()
  }
}

function getValidationFromRules(rules: any, value: any): ValidationGroup {
  // _.keys is untyped!!
  const { ref, ...withoutRef } = rules
  const validationsForField = Object.keys(withoutRef)
    .map(key => {
      const ruleValue = withoutRef[key]
      const validation = (formRules as any)[key as keyof typeof formRules](value, ruleValue as any)
      return { validation, key }
    })
    .filter(v => !!v.validation)
    .reduce((agg, { validation, key }) => {
      return {
        ...agg,
        [key]: validation
      }
    }, {})

  return validationsForField as ValidationGroup
}

export class FormScope<T, S extends keyof T> extends React.Component<
  FormScopeSharedPublicProps<T[S]> & FormScopePrivateProps<T> & FormSubScopePublicProps<T, S>
> {
  constructor(props: FormScopeSharedPublicProps<T[S]> & FormScopePrivateProps<T> & FormSubScopePublicProps<T, S>) {
    super(props)
  }
  /*
  shouldComponentUpdate(nextProps: FormScopePrivateProps<T> & FormSubScopePublicProps<T, S>) {
    // if not optimized scope always return true
    if (!this.props.optimized) return true

    if (nextProps.scope !== this.props.scope) throw Error('Scope cannot change for sub')
    if (nextProps.rootValue[nextProps.scope] !== this.props.rootValue[this.props.scope]) {
      return true
    }
    return false
  }
  */
  getValidationForField(lens: LensPathType) {
    // field not touched
    const rules = L.get(lens, this.props.rules)
    const touched = L.get(lens, this.props.touched)
    // const isFocused = _.includes(this.state.focusedFields, props.name)
    if (touched && rules) {
      const value = L.get(lens, this.props.value)
      const invalid = getValidationFromRules(rules, value)
      return Object.keys(invalid).length === 0 ? null : invalid
    }
    return null
  }
  getLensPathForField = (field: keyof T[S]) => {
    return L.compose(
      this.props.lensPath,
      field as any
    )
  }
  Sub: <B extends keyof T[S]>(
    props: FormSubScopePublicProps<T[S], B> & FormScopeSharedPublicProps<(T[S])[B]>
  ) => JSX.Element | null = props => {
    return (
      <FormScope
        {...props}
        iteration={this.props.iteration}
        setState={this.props.setState}
        rootValue={this.props.rootValue[this.props.scope]}
        value={this.props.value}
        rules={this.props.rules}
        touched={this.props.touched}
        onInsertRule={this.props.onInsertRule}
        onRemoveRule={this.props.onRemoveRule}
        touchField={this.props.touchField}
        unTouchField={this.props.unTouchField}
        lensPath={this.props.lensPath.concat([props.scope as any])}
        children={(value, a, b) => {
          return props.children(value, a, b)
        }}
      />
    )
  }
  Validation = (props: ValidationProps<T[S]>) => {
    const validation = this.getValidationForField(this.getLensPathForField(props.for))
    return props.children(validation)
  }
  TextArea = (props: TextAreaProps<T[S]>) => {
    return this.Input({ ...props, _textArea: true } as any)
  }
  Input = (props: InputProps<T[S]>) => {
    const rules = _.pick(props, _.keys(formRules)) as ValidationRules
    const lensPath = this.getLensPathForField(props.name)
    const value = L.get([lensPath, 'value', L.optional], this.props.value)
    if (!value == null && props.value == null)
      throw Error('Input needs to have value in Form state or provided one in props')
    if (!_.isEmpty(rules) && (props.disabled || props.readOnly))
      throw Error('Cant have rules on a non modifiable field')
    return (
      <InputInner
        onChange={this.riggedOnChange}
        value={value}
        _textArea={(props as any)._textArea}
        {..._.omit(_.omit(props, 'ref'), _.keys(formRules))}
        key={this.props.iteration + JSON.stringify(lensPath) + JSON.stringify(rules)}
        onDidMount={ref => {
          this.props.onInsertRule(lensPath, rules, ref)
        }}
        onWillUnmount={() => {
          this.props.onRemoveRule(lensPath)
        }}
        onBlur={() => {
          // touch non number fields on blur
          this.props.touchField(lensPath)
        }}
        onFocus={() => {
          /*
          if (props.type === "number") {
            this.props.touchField(lensPath)
          } else {
            // untouch all but number fields on focus
            this.props.unTouchField(lensPath)
            })
        } */
        }}
        name={props.name}
      />
    )
  }
  riggedOnChange = (e: React.FormEvent<any> | FormEventType<T[S]> | FormEventType<T[S]>[]) => {
    // a hack to know if these are fed
    if ((e as any).target && _.isObject((e as any).target)) {
      const event = e as any

      const state = L.set(this.getLensPathForField(event.target.name), event.target.value, this.props.value)
      console.log('newstate', state)
      this.props.setState({ value: state })
    } else if (_.isArray(e)) {
      const events = e as FormEventType<T[S]>[]
      console.log(events)
      /*
      const rigged = events.map(event => {
        return {
          data: event,
          rootLens: this.props.lensPathToRoot.concat([this.props.scope as any])
        }
      })*/
    } else {
      const event = e as FormEventType<T[S]>
      const value = L.assign(this.props.lensPath, event, this.props.value)
      console.log(event, this.props.lensPath, value)
      this.props.setState({ value })
      /*
      const rigged = {
        data: event,
        rootLens: this.props.lensPathToRoot.concat([this.props.scope as any])
      }
      const state = L.set(
        L.compose(
          this.getLensPathForField(event.target.name),
          'value'
        ),
        event,
        this.props.value
      )
      console.log('newstate', state)
      this.props.setState(state)
      */
    }
  }
  render() {
    const valueOnScope = this.props.lensPath === [] ? this.props.value : L.get(this.props.lensPath, this.props.value)
    return (
      <React.Fragment>
        {this.props.children(
          {
            Input: this.Input,
            TextArea: this.TextArea,
            Validation: this.Validation,
            Sub: this.Sub
          },
          valueOnScope,
          this.riggedOnChange
        )}
      </React.Fragment>
    )
  }
}

export interface FormState<T> {
  value: T
  touched: any
  rules: any
  refs: any
  iteration: 0
}

export class Form<T> extends React.Component<FormProps<T>, FormState<T>> {
  state: FormState<T> = {
    // no pricings yet registered so lets just cast this
    value: this.props.value,
    touched: {},
    rules: {},
    refs: {},
    iteration: 0
  }
  touchField = (lensPath: LensPathType) => {
    /* TODO Check that the path exists or else throw Error */
    if (!L.isDefined(lensPath)) {
      throw Error('Lens path does not exits in touchField: ' + lensPath.toString())
    }
    this.setState(state => {
      return { touched: L.set([lensPath, 'touched'], true, state.touched) }
    })
  }
  unTouchField = (lensPath: LensPathType) => {
    /* TODO Check that the path exists or else throw Error */
    if (!L.isDefined(lensPath)) {
      throw Error('Lens path does not exits in unTouchField: ' + lensPath.toString())
    }
    this.setState(state => {
      return { touched: L.set([lensPath, 'touched'], false, state.touched) }
    })
  }
  removeRule = (lensPath: LensPathType) => {
    /* TODO Check that the path exists or else throw Error */
    if (!L.isDefined(lensPath)) {
      throw Error('Lens path does not exits in removeRule: ' + lensPath.toString())
    }
    this.setState(state => {
      return { rules: L.remove([lensPath, 'rules', L.optional], state.rules) }
    })
  }
  insertRule = (lensPath: LensPathType, rule: ValidationRules, ref: React.RefObject<HTMLInputElement>) => {
    /* TODO Check that the path exists or else throw Error */
    if (!L.isDefined(lensPath)) {
      throw Error('Lens path does not exits in insertRule: ' + lensPath.toString())
    }
    this.setState(state => {
      return { rules: L.set(lensPath, rule, state.rules) }
    })
    this.setState(state => {
      return { refs: L.set(lensPath, ref, state.refs) }
    })
  }
  Root: (props: FormScopeSharedPublicProps<T>) => JSX.Element = props => {
    return (
      <FormScope
        {...props}
        iteration={this.state.iteration}
        rootValue={this.state}
        value={this.state.value}
        onInsertRule={this.insertRule}
        setState={(state: any) => {
          this.setState(state)
        }}
        onRemoveRule={this.removeRule}
        touchField={this.touchField}
        unTouchField={this.unTouchField}
        lensPath={[]}
        touched={this.state.touched}
        rules={this.state.rules}
        scope="value"
      />
    )
  }
  componentDidUpdate(prevProps: any) {
    if (prevProps.value !== this.props.value && JSON.stringify(prevProps.value) !== JSON.stringify(this.props.value)) {
      // Do a JSON parse to check this
      this.setState((state: any) => {
        return {
          value: this.props.value,
          iteration: state.iteration + 1,
          touched: {},
          refs: {},
          rules: {}
        }
      })
    }
  }
  render() {
    const props = _.omit(this.props, ['value', 'onChange'])
    return (
      <form
        {..._.omit(props, ['value', 'allowUndefinedPaths']) as any}
        onSubmit={(e: any) => {
          e.preventDefault()
          e.stopPropagation()
          /*
          const invalidFieldsLens = L.compose(
            wrappedValues,
            L.when((wv: any) => {
              const validation = getValidationFromRules(wv.rules, wv.value)
              return wv.rules && Object.keys(validation).length > 0
            })
          )
          const invalidFields = L.collect(invalidFieldsLens, this.state)
          if (invalidFields.length > 0) {
            invalidFields[0].ref.current.focus()
            this.setState(state => {
              return L.set([invalidFieldsLens, 'touched'], true, state)
            })
          } else {
            this.props.onChange(L.modify(wrappedValues, unWrapValue, this.state.value))
          }
          */
        }}
      >
        {this.props.children({
          Root: this.Root
        })}
      </form>
    )
  }
}
