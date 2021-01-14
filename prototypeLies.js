const getPrototypeLies = () => {
    // Lie Tests

    // object constructor descriptor should return undefined properties
    const getUndefinedValueLie = (obj, name) => {
        const objName = obj.name
        const objNameUncapitalized = window[objName.charAt(0).toLowerCase() + objName.slice(1)]
        const hasInvalidValue = !!objNameUncapitalized && (
            typeof Object.getOwnPropertyDescriptor(objNameUncapitalized, name) != 'undefined' ||
            typeof Reflect.getOwnPropertyDescriptor(objNameUncapitalized, name) != 'undefined'
        )
        return hasInvalidValue ? true : false
    }

    // creating a new instance of the API function should throw a TypeError
    const getNewInstanceTypeErrorLie = apiFunction => {
        let newTypeError
        try {
            new apiFunction()
            return true
        } catch (error) {
            return error.constructor.name != 'TypeError' ? true : false
        }
    }

    // extending the API function to a fake class should throw a TypeError
    const getClassExtendsTypeErrorLie = apiFunction => {
        try {
            class Fake extends apiFunction {}
            return true
        } catch (error) {
            // Native has TypeError and 'not a constructor' message in FF & Chrome
            return error.constructor.name != 'TypeError' ? true :
                !/not a constructor/i.test(error.message) ? true : false
        }
    }

    // setting prototype to null and converting to primitive value should throw a TypeError
    const getNullConversionTypeErrorLie = apiFunction => {
        const nativeProto = Object.getPrototypeOf(apiFunction)
        try {
            Object.setPrototypeOf(apiFunction, null) + ''
            return true
        } catch (error) {
            return error.constructor.name != 'TypeError' ? true : false
        } finally {
            // restore proto
            Object.setPrototypeOf(apiFunction, nativeProto)
        }
    }

    // toString() and toString().toString() should return a native string
    const getToStringLie = (apiFunction, name) => {
        /*
        Accepted strings:
        'function name() { [native code] }'
        'function name() {\n    [native code]\n}'
        'function get name() { [native code] }'
        'function get name() {\n    [native code]\n}'
        'function () { [native code] }'
        `function () {\n    [native code]\n}`
        */
        const nativeString = new RegExp(
            `^function (get ${name}|${name}|)\\(\\) {(\\n    | )\\[native code\\](\\n| )}$`
        )
        return (
            !nativeString.test(apiFunction.toString()) ||
            !nativeString.test(apiFunction.toString().toString())
        )
    }

    // 'prototype' should not exist in API function
    const getPrototypeInFunctionLie = apiFunction => 'prototype' in apiFunction ? true : false

    // 'arguments', 'caller', 'prototype', 'toString' should not exist in descriptor
    const getDescriptorLie = apiFunction => {
        const hasInvalidDescriptor = (
            !!Object.getOwnPropertyDescriptor(apiFunction, 'arguments') ||
            !!Reflect.getOwnPropertyDescriptor(apiFunction, 'arguments') ||
            !!Object.getOwnPropertyDescriptor(apiFunction, 'caller') ||
            !!Reflect.getOwnPropertyDescriptor(apiFunction, 'caller') ||
            !!Object.getOwnPropertyDescriptor(apiFunction, 'prototype') ||
            !!Reflect.getOwnPropertyDescriptor(apiFunction, 'prototype') ||
            !!Object.getOwnPropertyDescriptor(apiFunction, 'toString') ||
            !!Reflect.getOwnPropertyDescriptor(apiFunction, 'toString')
        )
        return hasInvalidDescriptor ? true : false
    }

    // 'arguments', 'caller', 'prototype', 'toString' should not exist as own property
    const getOwnPropertyLie = apiFunction => {
        const hasInvalidOwnProperty = (
            apiFunction.hasOwnProperty('arguments') ||
            apiFunction.hasOwnProperty('caller') ||
            apiFunction.hasOwnProperty('prototype') ||
            apiFunction.hasOwnProperty('toString')
        )
        return hasInvalidOwnProperty ? true : false
    }

    // descriptor keys should only contain 'length' and 'name' 
    const getDescriptorKeysLie = apiFunction => {
        const descriptorKeys = Object.keys(Object.getOwnPropertyDescriptors(apiFunction))
        const hasInvalidKeys = '' + descriptorKeys != 'length,name' && '' + descriptorKeys != 'name,length'
        return hasInvalidKeys ? true : false
    }

    // own property names should only contain 'length' and 'name' 
    const getOwnPropertyNamesLie = apiFunction => {
        const ownPropertyNames = Object.getOwnPropertyNames(apiFunction)
        const hasInvalidNames = (
            '' + ownPropertyNames != 'length,name' && '' + ownPropertyNames != 'name,length'
        )
        return hasInvalidNames ? true : false
    }

    // own keys names should only contain 'length' and 'name' 
    const getOwnKeysLie = apiFunction => {
        const ownKeys = Reflect.ownKeys(apiFunction)
        const hasInvalidKeys = '' + ownKeys != 'length,name' && '' + ownKeys != 'name,length'
        return hasInvalidKeys ? true : false
    }

    // API Function Test
    const getPrototypeLies = (apiFunction, obj = null) => {
        if (typeof apiFunction != 'function') {
            return {
                lied: false,
                lieTypes: []
            }
        }
        const name = apiFunction.name.replace(/get\s/, '')
        const lies = {
            // custom lie string names: adjust if desired
            'failed undefined value': obj ? getUndefinedValueLie(obj, name) : false,
            'failed new instance type error': getNewInstanceTypeErrorLie(apiFunction),
            'failed class extends type error': getClassExtendsTypeErrorLie(apiFunction),
            'failed null conversion type error': getNullConversionTypeErrorLie(apiFunction),
            'failed to string': getToStringLie(apiFunction, name),
            'failed prototype in function': getPrototypeInFunctionLie(apiFunction),
            'failed descriptor': getDescriptorLie(apiFunction),
            'failed own property': getOwnPropertyLie(apiFunction),
            'failed descriptor keys': getDescriptorKeysLie(apiFunction),
            'failed own property names': getOwnPropertyNamesLie(apiFunction),
            'failed own keys': getOwnKeysLie(apiFunction)
        }
        const lieTypes = Object.keys(lies).filter(key => !!lies[key])
        return {
            lied: lieTypes.length,
            lieTypes
        }
    }

    // Lie Detector
    const createLieDetector = () => {
        const props = {} // lie list and detail
        return {
            getProps: () => props,
            searchLies: (obj, {
                ignore
            } = {}) => Object.getOwnPropertyNames(obj.prototype).forEach(name => {
                if (name == 'constructor' || (ignore && new Set(ignore).has(name))) {
                    return
                }
                const apiName = `${obj.name}.${name}`
                try {
                    const proto = obj.prototype
                    let res // response from getPrototypeLies

                    // search if function
                    try {
                        const apiFunction = proto[name] // may trigger TypeError
                        if (typeof apiFunction == 'function') {
                            res = getPrototypeLies(proto[name])
                            if (res.lied) {
                                return (props[`${obj.name}.${name}`] = res.lieTypes)
                            }
                            return
                        }
                    } catch (error) {}
                    // else search getter function
                    const getterFunction = Object.getOwnPropertyDescriptor(proto, name).get
                    res = getPrototypeLies(getterFunction, obj) // send the obj for special tests
                    if (res.lied) {
                        return (props[apiName] = res.lieTypes)
                    }
                    return
                } catch (error) {
                    // API may be blocked or unsupported
                    return console.error(`${apiName} test failed`)
                }
            })

        }
    }

    const lieDetector = createLieDetector()
    const {
        searchLies
    } = lieDetector

    // search for lies: add properties to ignore if desired
    searchLies(Node)
    searchLies(Element)
    searchLies(HTMLElement)
    searchLies(HTMLCanvasElement)
    searchLies(Navigator)
    searchLies(Screen)
    searchLies(Date)
    searchLies(Intl.DateTimeFormat)
    searchLies(Intl.RelativeTimeFormat)
    searchLies(CanvasRenderingContext2D)
    searchLies(PluginArray)
    searchLies(Plugin)
    searchLies(Document)

    // if supported
    if ('WebGLRenderingContext' in window) {
        searchLies(WebGLRenderingContext)
    }
    if ('WebGL2RenderingContext' in window) {
        searchLies(WebGL2RenderingContext)
    }
    if ('OffscreenCanvasRenderingContext2D' in window) {
        searchLies(OffscreenCanvasRenderingContext2D)
    }
    if ('AnalyserNode' in window) {
        searchLies(AnalyserNode)
    }
    if ('AudioBuffer' in window) {
        searchLies(AudioBuffer)
    }

    // return lies list and detail 
    const props = lieDetector.getProps()
    return {
        lieList: Object.keys(props),
        lieDetail: props
    }
}

// start program
const { lieList, lieDetail } = getPrototypeLies() // execute and destructure the list and detail

// log to see the goods and analyze
console.log(lieList)
console.log(lieDetail)

// check lies later in any function
lieList.includes('HTMLCanvasElement.toDataURL') // returns true or false
lieDetail['HTMLCanvasElement.toDataURL'] // returns the list of lies
