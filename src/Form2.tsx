import * as React from 'react'
import * as _ from 'lodash'
import { formRules, ValidationRuleType, Validation } from './formrules'
const L: any = require('partial.lenses')
import { wrapValue, unWrapValue, wrappedValues, wrappedValuesLens } from './lenshelpers'

// just a random type name to avoid possible collisions

type ValidationRules = {
  [P in keyof typeof formRules]?: (typeof formRules)[P] extends ValidationRuleType<boolean>
    ? boolean
    : (typeof formRules)[P] extends ValidationRuleType<number>
      ? number
      : (typeof formRules)[P] extends ValidationRuleType<string> ? string : RegExp
}
export type ValidationGroup = { [K in keyof typeof formRules]?: Validation }

export type ValidationProps = {
  scope: LensPathType
  children: (validation: ValidationGroup | null) => JSX.Element
}
export type TextAreaProps = _.Omit<
  React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>,
  'ref'
> &
  ValidationRules & {
    scope: LensPathType
    value?: number | string | boolean
  }
export type InputProps = _.Omit<
  React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
  'ref'
> &
  ValidationRules & {
    scope: LensPathType
    value?: number | string | boolean
  }

type LensPathType = (string | number)[]

type FormEventType = { scope: LensPathType; value: any }

export interface FormProps<T>
  extends _.Omit<React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>, 'onChange'> {
  value: T
  onChange: (data: T) => void
  optimized?: boolean
  children: (
    Form: {
      Input: (props: InputProps) => JSX.Element
      TextArea: (props: TextAreaProps) => JSX.Element
      Validation: (props: ValidationProps) => JSX.Element
    },
    value: T,
    onChange: (event: FormEventType) => void
  ) => JSX.Element | null
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

export interface FormState<T> {
  value: T
  iteration: 0
}

export class Form<T> extends React.Component<FormProps<T>, FormState<T>> {
  state: FormState<T> = {
    // no pricings yet registered so lets just cast this
    value: L.modify(L.leafs, wrapValue, this.props.value),
    iteration: 0
  }
  getValidationForField(lens: LensPathType) {
    // field not touched
    const rules = L.get([lens, 'rules'], this.state.value)
    const touched = L.get([lens, 'touched'], this.state.value)
    if (touched && rules) {
      const value = L.get([lens, 'value'], this.state.value)
      const invalid = getValidationFromRules(rules, value)
      return Object.keys(invalid).length === 0 ? null : invalid
    }
    return null
  }
  Validation = (props: ValidationProps) => {
    const validation = this.getValidationForField(props.scope)
    return props.children(validation)
  }
  TextArea = (props: TextAreaProps) => {
    return this.Input({ ...props, _textArea: true } as any)
  }
  Input = (props: InputProps) => {
    const rules = _.pick(props, _.keys(formRules)) as ValidationRules
    const lensPath = props.scope
    const value = L.get([lensPath, 'value', L.optional], this.state.value)
    if (!value == null && props.value == null)
      throw Error('Input needs to have value in Form state or provided one in props')
    if (!_.isEmpty(rules) && (props.disabled || props.readOnly))
      throw Error('Cant have rules on a non modifiable field')
    return (
      <InputInner
        onChange={(e: any) => {
          const event = { scope: props.scope, value: e.target.value }
          this.onChange(event)
        }}
        value={value}
        _textArea={(props as any)._textArea}
        {..._.omit(_.omit(props, 'ref'), _.keys(formRules))}
        key={this.state.iteration + JSON.stringify(lensPath) + JSON.stringify(rules)}
        onDidMount={ref => {
          this.insertRule(lensPath as any, rules, ref)
        }}
        onWillUnmount={() => {
          this.removeRule(lensPath as any)
        }}
        onBlur={() => {
          // touch non number fields on blur
          this.touchField(lensPath as any)
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
      />
    )
  }
  onChange = (e: FormEventType) => {
    // a hack to know if these are fed
    const event = e as FormEventType
    const value = L.set([event.scope, wrappedValuesLens], event.value, this.state.value)
    this.setState({ value })
  }
  touchField = (lensPath: LensPathType) => {
    /* TODO Check that the path exists or else throw Error */
    if (!L.isDefined(lensPath)) {
      throw Error('Lens path does not exits in touchField: ' + lensPath.toString())
    }
    this.setState(state => {
      return { value: L.set([lensPath, 'touched'], true, state.value) }
    })
  }
  unTouchField = (lensPath: LensPathType) => {
    /* TODO Check that the path exists or else throw Error */
    if (!L.isDefined(lensPath)) {
      throw Error('Lens path does not exits in unTouchField: ' + lensPath.toString())
    }
    this.setState(state => {
      return { value: L.set([lensPath, 'touched'], false, state.value) }
    })
  }
  removeRule = (lensPath: LensPathType) => {
    /* TODO Check that the path exists or else throw Error */
    if (!L.isDefined(lensPath)) {
      throw Error('Lens path does not exits in removeRule: ' + lensPath.toString())
    }
    this.setState(state => {
      return { value: L.remove([lensPath, 'rules', L.optional], state.value) }
    })
  }
  insertRule = (lensPath: LensPathType, rule: ValidationRules, ref: React.RefObject<HTMLInputElement>) => {
    /* TODO Check that the path exists or else throw Error */
    if (!L.isDefined(lensPath)) {
      throw Error('Lens path does not exits in insertRule: ' + lensPath.toString())
    }
    this.setState(state => {
      return { value: L.set([lensPath, 'ref'], ref, L.set([lensPath, 'rules'], rule, state.value)) }
    })
  }
  componentDidUpdate(prevProps: any) {
    if (prevProps.value !== this.props.value && JSON.stringify(prevProps.value) !== JSON.stringify(this.props.value)) {
      // Do a JSON parse to check this
      this.setState((state: any) => {
        return {
          value: L.modify(L.leafs, wrapValue, this.props.value),
          iteration: state.iteration + 1
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
        }}
      >
        <React.Fragment>
          {this.props.children(
            {
              Input: this.Input,
              TextArea: this.TextArea,
              Validation: this.Validation
            },
            L.modify(wrappedValues, unWrapValue, this.state.value),
            this.onChange
          )}
        </React.Fragment>
      </form>
    )
  }
}
