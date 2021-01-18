/* Prototype lies */

const getIframe = () => {
    try {
        const numberOfIframes = window.length
        const frag = new DocumentFragment()
        const div = document.createElement('div')
        frag.appendChild(div)
        const ghost = () => `
			height: 100vh;
			width: 100vw;
			position: absolute;
			left:-10000px;
			visibility: hidden;
		`
        div.innerHTML = `<div style="${ghost()}"><iframe></iframe></div>`
        document.body.appendChild(frag)
        const iframeWindow = window[numberOfIframes]
        return {
            iframeWindow,
            div
        }
    } catch (error) {
        return {
            iframeWindow: window,
            div: undefined
        }
    }
}
const {
    iframeWindow,
    div: iframeContainerDiv
} = getIframe()

const getPrototypeLies = iframeWindow => {
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

    // calling the interface prototype on the function should throw a TypeError
    const getCallInterfaceTypeErrorLie = (apiFunction, proto) => {
        try {
            new apiFunction()
            apiFunction.call(proto)
            return true
        } catch (error) {
            return error.constructor.name != 'TypeError' ? true : false
        }
    }

    // applying the interface prototype on the function should throw a TypeError
    const getApplyInterfaceTypeErrorLie = (apiFunction, proto) => {
        try {
            new apiFunction()
            apiFunction.apply(proto)
            return true
        } catch (error) {
            return error.constructor.name != 'TypeError' ? true : false
        }
    }

    // creating a new instance of the function should throw a TypeError
    const getNewInstanceTypeErrorLie = apiFunction => {
        try {
            new apiFunction()
            return true
        } catch (error) {
            return error.constructor.name != 'TypeError' ? true : false
        }
    }

    // extending the function on a fake class should throw a TypeError and message "not a constructor"
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

    // setting prototype to null and converting to a string should throw a TypeError
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

    // toString() and toString.toString() should return a native string in all frames
    const getToStringLie = (apiFunction, name, iframeWindow) => {
        /*
        Accepted strings:
        'function name() { [native code] }'
        'function name() {\n    [native code]\n}'
        'function get name() { [native code] }'
        'function get name() {\n    [native code]\n}'
        'function () { [native code] }'
        `function () {\n    [native code]\n}`
        */
        const apiFunctionToString = (
            iframeWindow ?
            iframeWindow.Function.prototype.toString.call(apiFunction) :
            apiFunction.toString()
        )
        const apiFunctionToStringToString = (
            iframeWindow ?
            iframeWindow.Function.prototype.toString.call(apiFunction.toString) :
            apiFunction.toString.toString()
        )
        const trust = name => ({
            [`function ${name}() { [native code] }`]: true,
            [`function get ${name}() { [native code] }`]: true,
            [`function () { [native code] }`]: true,
            [`function ${name}() {${'\n'}    [native code]${'\n'}}`]: true,
            [`function get ${name}() {${'\n'}    [native code]${'\n'}}`]: true,
            [`function () {${'\n'}    [native code]${'\n'}}`]: true
        })
        return (
            !trust(name)[apiFunctionToString] ||
            !trust('toString')[apiFunctionToStringToString]
        )
    }

    // "prototype" in function should not exist
    const getPrototypeInFunctionLie = apiFunction => 'prototype' in apiFunction ? true : false

    // "arguments", "caller", "prototype", "toString"  should not exist in descriptor
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

    // "arguments", "caller", "prototype", "toString" should not exist as own property
    const getOwnPropertyLie = apiFunction => {
        const hasInvalidOwnProperty = (
            apiFunction.hasOwnProperty('arguments') ||
            apiFunction.hasOwnProperty('caller') ||
            apiFunction.hasOwnProperty('prototype') ||
            apiFunction.hasOwnProperty('toString')
        )
        return hasInvalidOwnProperty ? true : false
    }

    // descriptor keys should only contain "name" and "length"
    const getDescriptorKeysLie = apiFunction => {
        const descriptorKeys = Object.keys(Object.getOwnPropertyDescriptors(apiFunction))
        const hasInvalidKeys = '' + descriptorKeys != 'length,name' && '' + descriptorKeys != 'name,length'
        return hasInvalidKeys ? true : false
    }

    // own property names should only contain "name" and "length"
    const getOwnPropertyNamesLie = apiFunction => {
        const ownPropertyNames = Object.getOwnPropertyNames(apiFunction)
        const hasInvalidNames = (
            '' + ownPropertyNames != 'length,name' && '' + ownPropertyNames != 'name,length'
        )
        return hasInvalidNames ? true : false
    }

    // own keys names should only contain "name" and "length"
    const getOwnKeysLie = apiFunction => {
        const ownKeys = Reflect.ownKeys(apiFunction)
        const hasInvalidKeys = '' + ownKeys != 'length,name' && '' + ownKeys != 'name,length'
        return hasInvalidKeys ? true : false
    }

    // API Function Test
    const getLies = (apiFunction, proto, obj = null) => {
        if (typeof apiFunction != 'function') {
            return {
                lied: false,
                lieTypes: []
            }
        }
        const name = apiFunction.name.replace(/get\s/, '')
        const lies = {
            // custom lie string names
            [`a: object constructor descriptor should return undefined properties`]: obj ? getUndefinedValueLie(obj, name) : false,
            [`b: calling the interface prototype on the function should throw a TypeError`]: getCallInterfaceTypeErrorLie(apiFunction, proto),
            [`c: applying the interface prototype on the function should throw a TypeError`]: getApplyInterfaceTypeErrorLie(apiFunction, proto),
            [`d: creating a new instance of the function should throw a TypeError`]: getNewInstanceTypeErrorLie(apiFunction),
            [`e: extending the function on a fake class should throw a TypeError`]: getClassExtendsTypeErrorLie(apiFunction),
            [`f: setting prototype to null and converting to a string should throw a TypeError`]: getNullConversionTypeErrorLie(apiFunction),
            [`g: toString() and toString.toString() should return a native string in all frames`]: getToStringLie(apiFunction, name, iframeWindow),
            [`h: "prototype" in function should not exist`]: getPrototypeInFunctionLie(apiFunction),
            [`i: "arguments", "caller", "prototype", "toString"  should not exist in descriptor`]: getDescriptorLie(apiFunction),
            [`j: "arguments", "caller", "prototype", "toString" should not exist as own property`]: getOwnPropertyLie(apiFunction),
            [`k: descriptor keys should only contain "name" and "length"`]: getDescriptorKeysLie(apiFunction),
            [`l: own property names should only contain "name" and "length"`]: getOwnPropertyNamesLie(apiFunction),
            [`m: own keys names should only contain "name" and "length"`]: getOwnKeysLie(apiFunction)
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
        let propsSearched = [] // list of properties searched
        return {
            getProps: () => props,
            getPropsSearched: () => propsSearched,
            searchLies: (obj, {
                ignore
            } = {}) => Object.getOwnPropertyNames(!!obj && !!obj.prototype ? obj.prototype : !!obj ? obj : {}).forEach(name => {
                if (name == 'constructor' || (ignore && new Set(ignore).has(name))) {
                    return
                }
                const objectNameString = /\s(.+)\]/
                const apiName = `${
					obj.name ? obj.name : objectNameString.test(obj) ? objectNameString.exec(obj)[1] : undefined
				}.${name}`
                propsSearched.push(apiName)
                try {
                    const proto = obj.prototype ? obj.prototype : obj
                    let res // response from getLies

                    // search if function
                    try {
                        const apiFunction = proto[name] // may trigger TypeError
                        if (typeof apiFunction == 'function') {
                            res = getLies(proto[name], proto)
                            if (res.lied) {
                                return (props[apiName] = res.lieTypes)
                            }
                            return
                        }
                    } catch (error) {}
                    // else search getter function
                    const getterFunction = Object.getOwnPropertyDescriptor(proto, name).get
                    res = getLies(getterFunction, proto, obj) // send the obj for special tests
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

    if ('AnalyserNode' in window) {
        searchLies(AnalyserNode)
    }
    if ('AudioBuffer' in window) {
        searchLies(AudioBuffer)
    }
    if ('BiquadFilterNode' in window) {
        searchLies(BiquadFilterNode)
    }
    searchLies(CanvasRenderingContext2D)
    searchLies(Date)
    searchLies(Intl.DateTimeFormat)
    searchLies(Document)
    searchLies(DOMRect)
    searchLies(DOMRectReadOnly)
    searchLies(Element)
    searchLies(Function)
    searchLies(HTMLCanvasElement)
    searchLies(HTMLElement)
    searchLies(HTMLIFrameElement)
    if ('IntersectionObserverEntry' in window) {
        searchLies(IntersectionObserverEntry)
    }
    searchLies(Math)
    if ('MediaDevices' in window) {
        searchLies(MediaDevices)
    }
    searchLies(Navigator)
    searchLies(Node)
    if ('OffscreenCanvasRenderingContext2D' in window) {
        searchLies(OffscreenCanvasRenderingContext2D)
    }
    searchLies(Range)
    searchLies(Intl.RelativeTimeFormat)
    searchLies(Screen)
    if ('SVGRect' in window) {
        searchLies(SVGRect)
    }
    searchLies(TextMetrics)
    if ('WebGLRenderingContext' in window) {
        searchLies(WebGLRenderingContext)
    }
    if ('WebGL2RenderingContext' in window) {
        searchLies(WebGL2RenderingContext)
    }

    /* potential targets:
    	RTCPeerConnection
    	Plugin
    	PluginArray
    	MimeType
    	MimeTypeArray
    	Worker
    	History
    */

    // return lies list and detail 
    const props = lieDetector.getProps()
    const propsSearched = lieDetector.getPropsSearched()
    return {
        lieList: Object.keys(props).sort(),
        lieDetail: props,
        lieCount: Object.keys(props).reduce((acc, key) => acc + props[key].length, 0),
        propsSearched
    }
}

// start program
const start = performance.now()
const {
    lieList,
    lieDetail,
    lieCount,
    propsSearched
} = getPrototypeLies(iframeWindow) // execute and destructure the list and detail
if (iframeContainerDiv) {
    iframeContainerDiv.parentNode.removeChild(iframeContainerDiv)
}
const perf = performance.now() - start

// check lies later in any function
lieList.includes('HTMLCanvasElement.toDataURL') // returns true or false
lieDetail['HTMLCanvasElement.toDataURL'] // returns the list of lies

console.log(propsSearched)
console.log(lieList)
console.log(lieDetail)
