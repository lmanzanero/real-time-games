
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key === '__value') {
                node.value = node[key] = attributes[key];
            }
            else if (descriptors[key] && descriptors[key].set) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* node_modules/svelte-seo/src/SvelteSeo.svelte generated by Svelte v3.24.1 */

    const file = "node_modules/svelte-seo/src/SvelteSeo.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (11:2) {#if title}
    function create_if_block_17(ctx) {
    	let title_value;
    	document.title = title_value = /*title*/ ctx[0];
    	const block = { c: noop, m: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_17.name,
    		type: "if",
    		source: "(11:2) {#if title}",
    		ctx
    	});

    	return block;
    }

    // (22:2) {#if description}
    function create_if_block_16(ctx) {
    	let meta;

    	const block = {
    		c: function create() {
    			meta = element("meta");
    			attr_dev(meta, "name", "description");
    			attr_dev(meta, "content", /*description*/ ctx[3]);
    			add_location(meta, file, 22, 4, 543);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, meta, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*description*/ 8) {
    				attr_dev(meta, "content", /*description*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(meta);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_16.name,
    		type: "if",
    		source: "(22:2) {#if description}",
    		ctx
    	});

    	return block;
    }

    // (26:2) {#if openGraph}
    function create_if_block(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let if_block5_anchor;
    	let if_block0 = /*openGraph*/ ctx[5].title && create_if_block_15(ctx);
    	let if_block1 = /*openGraph*/ ctx[5].description && create_if_block_14(ctx);
    	let if_block2 = (/*openGraph*/ ctx[5].url || /*canonical*/ ctx[4]) && create_if_block_13(ctx);
    	let if_block3 = /*openGraph*/ ctx[5].type && create_if_block_12(ctx);
    	let if_block4 = /*openGraph*/ ctx[5].article && create_if_block_5(ctx);
    	let if_block5 = /*openGraph*/ ctx[5].images && /*openGraph*/ ctx[5].images.length && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			if (if_block3) if_block3.c();
    			t3 = space();
    			if (if_block4) if_block4.c();
    			t4 = space();
    			if (if_block5) if_block5.c();
    			if_block5_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			if (if_block3) if_block3.m(target, anchor);
    			insert_dev(target, t3, anchor);
    			if (if_block4) if_block4.m(target, anchor);
    			insert_dev(target, t4, anchor);
    			if (if_block5) if_block5.m(target, anchor);
    			insert_dev(target, if_block5_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*openGraph*/ ctx[5].title) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_15(ctx);
    					if_block0.c();
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*openGraph*/ ctx[5].description) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_14(ctx);
    					if_block1.c();
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*openGraph*/ ctx[5].url || /*canonical*/ ctx[4]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_13(ctx);
    					if_block2.c();
    					if_block2.m(t2.parentNode, t2);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*openGraph*/ ctx[5].type) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_12(ctx);
    					if_block3.c();
    					if_block3.m(t3.parentNode, t3);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*openGraph*/ ctx[5].article) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_5(ctx);
    					if_block4.c();
    					if_block4.m(t4.parentNode, t4);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (/*openGraph*/ ctx[5].images && /*openGraph*/ ctx[5].images.length) {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);
    				} else {
    					if_block5 = create_if_block_1(ctx);
    					if_block5.c();
    					if_block5.m(if_block5_anchor.parentNode, if_block5_anchor);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (if_block3) if_block3.d(detaching);
    			if (detaching) detach_dev(t3);
    			if (if_block4) if_block4.d(detaching);
    			if (detaching) detach_dev(t4);
    			if (if_block5) if_block5.d(detaching);
    			if (detaching) detach_dev(if_block5_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(26:2) {#if openGraph}",
    		ctx
    	});

    	return block;
    }

    // (27:4) {#if openGraph.title}
    function create_if_block_15(ctx) {
    	let meta;
    	let meta_content_value;

    	const block = {
    		c: function create() {
    			meta = element("meta");
    			attr_dev(meta, "property", "og:title");
    			attr_dev(meta, "content", meta_content_value = /*openGraph*/ ctx[5].title);
    			add_location(meta, file, 27, 8, 654);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, meta, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*openGraph*/ 32 && meta_content_value !== (meta_content_value = /*openGraph*/ ctx[5].title)) {
    				attr_dev(meta, "content", meta_content_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(meta);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_15.name,
    		type: "if",
    		source: "(27:4) {#if openGraph.title}",
    		ctx
    	});

    	return block;
    }

    // (31:4) {#if openGraph.description}
    function create_if_block_14(ctx) {
    	let meta;
    	let meta_content_value;

    	const block = {
    		c: function create() {
    			meta = element("meta");
    			attr_dev(meta, "property", "og:description");
    			attr_dev(meta, "content", meta_content_value = /*openGraph*/ ctx[5].description);
    			add_location(meta, file, 31, 6, 758);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, meta, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*openGraph*/ 32 && meta_content_value !== (meta_content_value = /*openGraph*/ ctx[5].description)) {
    				attr_dev(meta, "content", meta_content_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(meta);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_14.name,
    		type: "if",
    		source: "(31:4) {#if openGraph.description}",
    		ctx
    	});

    	return block;
    }

    // (35:4) {#if openGraph.url || canonical}
    function create_if_block_13(ctx) {
    	let meta;
    	let meta_content_value;

    	const block = {
    		c: function create() {
    			meta = element("meta");
    			attr_dev(meta, "property", "og:url");
    			attr_dev(meta, "content", meta_content_value = /*openGraph*/ ctx[5].url || /*canonical*/ ctx[4]);
    			add_location(meta, file, 35, 6, 879);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, meta, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*openGraph, canonical*/ 48 && meta_content_value !== (meta_content_value = /*openGraph*/ ctx[5].url || /*canonical*/ ctx[4])) {
    				attr_dev(meta, "content", meta_content_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(meta);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_13.name,
    		type: "if",
    		source: "(35:4) {#if openGraph.url || canonical}",
    		ctx
    	});

    	return block;
    }

    // (39:4) {#if openGraph.type}
    function create_if_block_12(ctx) {
    	let meta;
    	let meta_content_value;

    	const block = {
    		c: function create() {
    			meta = element("meta");
    			attr_dev(meta, "property", "og:type");
    			attr_dev(meta, "content", meta_content_value = /*openGraph*/ ctx[5].type.toLowerCase());
    			add_location(meta, file, 39, 6, 985);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, meta, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*openGraph*/ 32 && meta_content_value !== (meta_content_value = /*openGraph*/ ctx[5].type.toLowerCase())) {
    				attr_dev(meta, "content", meta_content_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(meta);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(39:4) {#if openGraph.type}",
    		ctx
    	});

    	return block;
    }

    // (43:4) {#if openGraph.article}
    function create_if_block_5(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let if_block5_anchor;
    	let if_block0 = /*openGraph*/ ctx[5].article.publishedTime && create_if_block_11(ctx);
    	let if_block1 = /*openGraph*/ ctx[5].article.modifiedTime && create_if_block_10(ctx);
    	let if_block2 = /*openGraph*/ ctx[5].article.expirationTime && create_if_block_9(ctx);
    	let if_block3 = /*openGraph*/ ctx[5].article.section && create_if_block_8(ctx);
    	let if_block4 = /*openGraph*/ ctx[5].article.authors && /*openGraph*/ ctx[5].article.authors.length && create_if_block_7(ctx);
    	let if_block5 = /*openGraph*/ ctx[5].article.tags && /*openGraph*/ ctx[5].article.tags.length && create_if_block_6(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			if (if_block3) if_block3.c();
    			t3 = space();
    			if (if_block4) if_block4.c();
    			t4 = space();
    			if (if_block5) if_block5.c();
    			if_block5_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			if (if_block3) if_block3.m(target, anchor);
    			insert_dev(target, t3, anchor);
    			if (if_block4) if_block4.m(target, anchor);
    			insert_dev(target, t4, anchor);
    			if (if_block5) if_block5.m(target, anchor);
    			insert_dev(target, if_block5_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*openGraph*/ ctx[5].article.publishedTime) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_11(ctx);
    					if_block0.c();
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*openGraph*/ ctx[5].article.modifiedTime) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_10(ctx);
    					if_block1.c();
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*openGraph*/ ctx[5].article.expirationTime) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_9(ctx);
    					if_block2.c();
    					if_block2.m(t2.parentNode, t2);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*openGraph*/ ctx[5].article.section) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_8(ctx);
    					if_block3.c();
    					if_block3.m(t3.parentNode, t3);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*openGraph*/ ctx[5].article.authors && /*openGraph*/ ctx[5].article.authors.length) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_7(ctx);
    					if_block4.c();
    					if_block4.m(t4.parentNode, t4);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (/*openGraph*/ ctx[5].article.tags && /*openGraph*/ ctx[5].article.tags.length) {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);
    				} else {
    					if_block5 = create_if_block_6(ctx);
    					if_block5.c();
    					if_block5.m(if_block5_anchor.parentNode, if_block5_anchor);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (if_block3) if_block3.d(detaching);
    			if (detaching) detach_dev(t3);
    			if (if_block4) if_block4.d(detaching);
    			if (detaching) detach_dev(t4);
    			if (if_block5) if_block5.d(detaching);
    			if (detaching) detach_dev(if_block5_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(43:4) {#if openGraph.article}",
    		ctx
    	});

    	return block;
    }

    // (44:6) {#if openGraph.article.publishedTime}
    function create_if_block_11(ctx) {
    	let meta;
    	let meta_content_value;

    	const block = {
    		c: function create() {
    			meta = element("meta");
    			attr_dev(meta, "property", "article:published_time");
    			attr_dev(meta, "content", meta_content_value = /*openGraph*/ ctx[5].article.publishedTime);
    			add_location(meta, file, 44, 8, 1143);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, meta, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*openGraph*/ 32 && meta_content_value !== (meta_content_value = /*openGraph*/ ctx[5].article.publishedTime)) {
    				attr_dev(meta, "content", meta_content_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(meta);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(44:6) {#if openGraph.article.publishedTime}",
    		ctx
    	});

    	return block;
    }

    // (50:6) {#if openGraph.article.modifiedTime}
    function create_if_block_10(ctx) {
    	let meta;
    	let meta_content_value;

    	const block = {
    		c: function create() {
    			meta = element("meta");
    			attr_dev(meta, "property", "article:modified_time");
    			attr_dev(meta, "content", meta_content_value = /*openGraph*/ ctx[5].article.modifiedTime);
    			add_location(meta, file, 50, 8, 1312);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, meta, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*openGraph*/ 32 && meta_content_value !== (meta_content_value = /*openGraph*/ ctx[5].article.modifiedTime)) {
    				attr_dev(meta, "content", meta_content_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(meta);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(50:6) {#if openGraph.article.modifiedTime}",
    		ctx
    	});

    	return block;
    }

    // (56:6) {#if openGraph.article.expirationTime}
    function create_if_block_9(ctx) {
    	let meta;
    	let meta_content_value;

    	const block = {
    		c: function create() {
    			meta = element("meta");
    			attr_dev(meta, "property", "article:expiration_time");
    			attr_dev(meta, "content", meta_content_value = /*openGraph*/ ctx[5].article.expirationTime);
    			add_location(meta, file, 56, 8, 1481);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, meta, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*openGraph*/ 32 && meta_content_value !== (meta_content_value = /*openGraph*/ ctx[5].article.expirationTime)) {
    				attr_dev(meta, "content", meta_content_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(meta);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(56:6) {#if openGraph.article.expirationTime}",
    		ctx
    	});

    	return block;
    }

    // (62:6) {#if openGraph.article.section}
    function create_if_block_8(ctx) {
    	let meta;
    	let meta_content_value;

    	const block = {
    		c: function create() {
    			meta = element("meta");
    			attr_dev(meta, "property", "article:section");
    			attr_dev(meta, "content", meta_content_value = /*openGraph*/ ctx[5].article.section);
    			add_location(meta, file, 62, 8, 1647);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, meta, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*openGraph*/ 32 && meta_content_value !== (meta_content_value = /*openGraph*/ ctx[5].article.section)) {
    				attr_dev(meta, "content", meta_content_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(meta);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(62:6) {#if openGraph.article.section}",
    		ctx
    	});

    	return block;
    }

    // (66:6) {#if openGraph.article.authors && openGraph.article.authors.length}
    function create_if_block_7(ctx) {
    	let each_1_anchor;
    	let each_value_2 = /*openGraph*/ ctx[5].article.authors;
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*openGraph*/ 32) {
    				each_value_2 = /*openGraph*/ ctx[5].article.authors;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(66:6) {#if openGraph.article.authors && openGraph.article.authors.length}",
    		ctx
    	});

    	return block;
    }

    // (67:8) {#each openGraph.article.authors as author}
    function create_each_block_2(ctx) {
    	let meta;
    	let meta_content_value;

    	const block = {
    		c: function create() {
    			meta = element("meta");
    			attr_dev(meta, "property", "article:author");
    			attr_dev(meta, "content", meta_content_value = /*author*/ ctx[12]);
    			add_location(meta, file, 67, 10, 1868);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, meta, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*openGraph*/ 32 && meta_content_value !== (meta_content_value = /*author*/ ctx[12])) {
    				attr_dev(meta, "content", meta_content_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(meta);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(67:8) {#each openGraph.article.authors as author}",
    		ctx
    	});

    	return block;
    }

    // (72:6) {#if openGraph.article.tags && openGraph.article.tags.length}
    function create_if_block_6(ctx) {
    	let each_1_anchor;
    	let each_value_1 = /*openGraph*/ ctx[5].article.tags;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*openGraph*/ 32) {
    				each_value_1 = /*openGraph*/ ctx[5].article.tags;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(72:6) {#if openGraph.article.tags && openGraph.article.tags.length}",
    		ctx
    	});

    	return block;
    }

    // (73:8) {#each openGraph.article.tags as tag}
    function create_each_block_1(ctx) {
    	let meta;
    	let meta_content_value;

    	const block = {
    		c: function create() {
    			meta = element("meta");
    			attr_dev(meta, "property", "article:tag");
    			attr_dev(meta, "content", meta_content_value = /*tag*/ ctx[9]);
    			add_location(meta, file, 73, 10, 2073);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, meta, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*openGraph*/ 32 && meta_content_value !== (meta_content_value = /*tag*/ ctx[9])) {
    				attr_dev(meta, "content", meta_content_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(meta);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(73:8) {#each openGraph.article.tags as tag}",
    		ctx
    	});

    	return block;
    }

    // (79:4) {#if openGraph.images && openGraph.images.length}
    function create_if_block_1(ctx) {
    	let each_1_anchor;
    	let each_value = /*openGraph*/ ctx[5].images;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*openGraph*/ 32) {
    				each_value = /*openGraph*/ ctx[5].images;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(79:4) {#if openGraph.images && openGraph.images.length}",
    		ctx
    	});

    	return block;
    }

    // (82:8) {#if image.alt}
    function create_if_block_4(ctx) {
    	let meta;
    	let meta_content_value;

    	const block = {
    		c: function create() {
    			meta = element("meta");
    			attr_dev(meta, "property", "og:image:alt");
    			attr_dev(meta, "content", meta_content_value = /*image*/ ctx[6].alt);
    			add_location(meta, file, 82, 10, 2343);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, meta, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*openGraph*/ 32 && meta_content_value !== (meta_content_value = /*image*/ ctx[6].alt)) {
    				attr_dev(meta, "content", meta_content_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(meta);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(82:8) {#if image.alt}",
    		ctx
    	});

    	return block;
    }

    // (85:8) {#if image.width}
    function create_if_block_3(ctx) {
    	let meta;
    	let meta_content_value;

    	const block = {
    		c: function create() {
    			meta = element("meta");
    			attr_dev(meta, "property", "og:image:width");
    			attr_dev(meta, "content", meta_content_value = /*image*/ ctx[6].width.toString());
    			add_location(meta, file, 85, 10, 2446);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, meta, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*openGraph*/ 32 && meta_content_value !== (meta_content_value = /*image*/ ctx[6].width.toString())) {
    				attr_dev(meta, "content", meta_content_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(meta);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(85:8) {#if image.width}",
    		ctx
    	});

    	return block;
    }

    // (88:8) {#if image.height}
    function create_if_block_2(ctx) {
    	let meta;
    	let meta_content_value;

    	const block = {
    		c: function create() {
    			meta = element("meta");
    			attr_dev(meta, "property", "og:image:height");
    			attr_dev(meta, "content", meta_content_value = /*image*/ ctx[6].height.toString());
    			add_location(meta, file, 88, 10, 2565);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, meta, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*openGraph*/ 32 && meta_content_value !== (meta_content_value = /*image*/ ctx[6].height.toString())) {
    				attr_dev(meta, "content", meta_content_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(meta);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(88:8) {#if image.height}",
    		ctx
    	});

    	return block;
    }

    // (80:6) {#each openGraph.images as image}
    function create_each_block(ctx) {
    	let meta;
    	let meta_content_value;
    	let t0;
    	let t1;
    	let t2;
    	let if_block2_anchor;
    	let if_block0 = /*image*/ ctx[6].alt && create_if_block_4(ctx);
    	let if_block1 = /*image*/ ctx[6].width && create_if_block_3(ctx);
    	let if_block2 = /*image*/ ctx[6].height && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			meta = element("meta");
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    			attr_dev(meta, "property", "og:image");
    			attr_dev(meta, "content", meta_content_value = /*image*/ ctx[6].url);
    			add_location(meta, file, 80, 8, 2260);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, meta, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, if_block2_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*openGraph*/ 32 && meta_content_value !== (meta_content_value = /*image*/ ctx[6].url)) {
    				attr_dev(meta, "content", meta_content_value);
    			}

    			if (/*image*/ ctx[6].alt) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(t1.parentNode, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*image*/ ctx[6].width) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3(ctx);
    					if_block1.c();
    					if_block1.m(t2.parentNode, t2);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*image*/ ctx[6].height) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_2(ctx);
    					if_block2.c();
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(meta);
    			if (detaching) detach_dev(t0);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(if_block2_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(80:6) {#each openGraph.images as image}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let meta0;
    	let meta0_content_value;
    	let meta1;
    	let meta1_content_value;
    	let if_block1_anchor;
    	let if_block2_anchor;
    	let if_block0 = /*title*/ ctx[0] && create_if_block_17(ctx);
    	let if_block1 = /*description*/ ctx[3] && create_if_block_16(ctx);
    	let if_block2 = /*openGraph*/ ctx[5] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			meta0 = element("meta");
    			meta1 = element("meta");
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    			attr_dev(meta0, "name", "robots");
    			attr_dev(meta0, "content", meta0_content_value = `${/*noindex*/ ctx[1] ? "noindex" : "index"},${/*nofollow*/ ctx[2] ? "nofollow" : "follow"}`);
    			add_location(meta0, file, 14, 2, 289);
    			attr_dev(meta1, "name", "googlebot");
    			attr_dev(meta1, "content", meta1_content_value = `${/*noindex*/ ctx[1] ? "noindex" : "index"},${/*nofollow*/ ctx[2] ? "nofollow" : "follow"}`);
    			add_location(meta1, file, 17, 2, 403);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(document.head, null);
    			append_dev(document.head, meta0);
    			append_dev(document.head, meta1);
    			if (if_block1) if_block1.m(document.head, null);
    			append_dev(document.head, if_block1_anchor);
    			if (if_block2) if_block2.m(document.head, null);
    			append_dev(document.head, if_block2_anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*title*/ ctx[0]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_17(ctx);
    					if_block0.c();
    					if_block0.m(meta0.parentNode, meta0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*noindex, nofollow*/ 6 && meta0_content_value !== (meta0_content_value = `${/*noindex*/ ctx[1] ? "noindex" : "index"},${/*nofollow*/ ctx[2] ? "nofollow" : "follow"}`)) {
    				attr_dev(meta0, "content", meta0_content_value);
    			}

    			if (dirty & /*noindex, nofollow*/ 6 && meta1_content_value !== (meta1_content_value = `${/*noindex*/ ctx[1] ? "noindex" : "index"},${/*nofollow*/ ctx[2] ? "nofollow" : "follow"}`)) {
    				attr_dev(meta1, "content", meta1_content_value);
    			}

    			if (/*description*/ ctx[3]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_16(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*openGraph*/ ctx[5]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block(ctx);
    					if_block2.c();
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			detach_dev(meta0);
    			detach_dev(meta1);
    			if (if_block1) if_block1.d(detaching);
    			detach_dev(if_block1_anchor);
    			if (if_block2) if_block2.d(detaching);
    			detach_dev(if_block2_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { title = undefined } = $$props;
    	let { noindex = false } = $$props;
    	let { nofollow = false } = $$props;
    	let { description = undefined } = $$props;
    	let { canonical = undefined } = $$props;
    	let { openGraph = undefined } = $$props;
    	const writable_props = ["title", "noindex", "nofollow", "description", "canonical", "openGraph"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SvelteSeo> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("SvelteSeo", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("noindex" in $$props) $$invalidate(1, noindex = $$props.noindex);
    		if ("nofollow" in $$props) $$invalidate(2, nofollow = $$props.nofollow);
    		if ("description" in $$props) $$invalidate(3, description = $$props.description);
    		if ("canonical" in $$props) $$invalidate(4, canonical = $$props.canonical);
    		if ("openGraph" in $$props) $$invalidate(5, openGraph = $$props.openGraph);
    	};

    	$$self.$capture_state = () => ({
    		title,
    		noindex,
    		nofollow,
    		description,
    		canonical,
    		openGraph
    	});

    	$$self.$inject_state = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("noindex" in $$props) $$invalidate(1, noindex = $$props.noindex);
    		if ("nofollow" in $$props) $$invalidate(2, nofollow = $$props.nofollow);
    		if ("description" in $$props) $$invalidate(3, description = $$props.description);
    		if ("canonical" in $$props) $$invalidate(4, canonical = $$props.canonical);
    		if ("openGraph" in $$props) $$invalidate(5, openGraph = $$props.openGraph);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [title, noindex, nofollow, description, canonical, openGraph];
    }

    class SvelteSeo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			title: 0,
    			noindex: 1,
    			nofollow: 2,
    			description: 3,
    			canonical: 4,
    			openGraph: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SvelteSeo",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get title() {
    		throw new Error("<SvelteSeo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<SvelteSeo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get noindex() {
    		throw new Error("<SvelteSeo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set noindex(value) {
    		throw new Error("<SvelteSeo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get nofollow() {
    		throw new Error("<SvelteSeo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nofollow(value) {
    		throw new Error("<SvelteSeo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get description() {
    		throw new Error("<SvelteSeo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set description(value) {
    		throw new Error("<SvelteSeo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get canonical() {
    		throw new Error("<SvelteSeo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set canonical(value) {
    		throw new Error("<SvelteSeo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get openGraph() {
    		throw new Error("<SvelteSeo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set openGraph(value) {
    		throw new Error("<SvelteSeo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const LOCATION = {};
    const ROUTER = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    function getLocation(source) {
      return {
        ...source.location,
        state: source.history.state,
        key: (source.history.state && source.history.state.key) || "initial"
      };
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);

      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({ location, action: "POP" });
          };

          source.addEventListener("popstate", popstateListener);

          return () => {
            source.removeEventListener("popstate", popstateListener);

            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, { state, replace = false } = {}) {
          state = { ...state, key: Date.now() + "" };
          // try...catch iOS Safari limits to 100 pushState calls
          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({ location, action: "PUSH" }));
        }
      };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{ pathname: initialPathname, search: "" }];
      const states = [];

      return {
        get location() {
          return stack[index];
        },
        addEventListener(name, fn) {},
        removeEventListener(name, fn) {},
        history: {
          get entries() {
            return stack;
          },
          get index() {
            return index;
          },
          get state() {
            return states[index];
          },
          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({ pathname, search });
            states.push(state);
          },
          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = { pathname, search };
            states[index] = state;
          }
        }
      };
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = Boolean(
      typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
    const { navigate } = globalHistory;

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    const paramRe = /^:(.+)/;

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Check if `string` starts with `search`
     * @param {string} string
     * @param {string} search
     * @return {boolean}
     */
    function startsWith(string, search) {
      return string.substr(0, search.length) === search;
    }

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    function isRootSegment(segment) {
      return segment === "";
    }

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    function isDynamic(segment) {
      return paramRe.test(segment);
    }

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    function isSplat(segment) {
      return segment[0] === "*";
    }

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri) {
      return (
        uri
          // Strip starting/ending `/`
          .replace(/(^\/+|\/+$)/g, "")
          .split("/")
      );
    }

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
      const score = route.default
        ? 0
        : segmentize(route.path).reduce((score, segment) => {
            score += SEGMENT_POINTS;

            if (isRootSegment(segment)) {
              score += ROOT_POINTS;
            } else if (isDynamic(segment)) {
              score += DYNAMIC_POINTS;
            } else if (isSplat(segment)) {
              score -= SEGMENT_POINTS + SPLAT_PENALTY;
            } else {
              score += STATIC_POINTS;
            }

            return score;
          }, 0);

      return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
      return (
        routes
          .map(rankRoute)
          // If two routes have the exact same score, we go by index instead
          .sort((a, b) =>
            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
          )
      );
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
      let match;
      let default_;

      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

            params[splatName] = uriSegments
              .slice(index)
              .map(decodeURIComponent)
              .join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }

    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
      return pick([route], uri);
    }

    /**
     * Add the query to the pathname if a query is given
     * @param {string} pathname
     * @param {string} [query]
     * @return {string}
     */
    function addQuery(pathname, query) {
      return pathname + (query ? `?${query}` : "");
    }

    /**
     * Resolve URIs as though every path is a directory, no files. Relative URIs
     * in the browser can feel awkward because not only can you be "in a directory",
     * you can be "at a file", too. For example:
     *
     *  browserSpecResolve('foo', '/bar/') => /bar/foo
     *  browserSpecResolve('foo', '/bar') => /foo
     *
     * But on the command line of a file system, it's not as complicated. You can't
     * `cd` from a file, only directories. This way, links have to know less about
     * their current path. To go deeper you can do this:
     *
     *  <Link to="deeper"/>
     *  // instead of
     *  <Link to=`{${props.uri}/deeper}`/>
     *
     * Just like `cd`, if you want to go deeper from the command line, you do this:
     *
     *  cd deeper
     *  # not
     *  cd $(pwd)/deeper
     *
     * By treating every path as a directory, linking to relative paths should
     * require less contextual information and (fingers crossed) be more intuitive.
     * @param {string} to
     * @param {string} base
     * @return {string}
     */
    function resolve(to, base) {
      // /foo/bar, /baz/qux => /foo/bar
      if (startsWith(to, "/")) {
        return to;
      }

      const [toPathname, toQuery] = to.split("?");
      const [basePathname] = base.split("?");
      const toSegments = segmentize(toPathname);
      const baseSegments = segmentize(basePathname);

      // ?a=b, /users?b=c => /users?a=b
      if (toSegments[0] === "") {
        return addQuery(basePathname, toQuery);
      }

      // profile, /users/789 => /users/789/profile
      if (!startsWith(toSegments[0], ".")) {
        const pathname = baseSegments.concat(toSegments).join("/");

        return addQuery((basePathname === "/" ? "" : "/") + pathname, toQuery);
      }

      // ./       , /users/123 => /users/123
      // ../      , /users/123 => /users
      // ../..    , /users/123 => /
      // ../../one, /a/b/c/d   => /a/b/one
      // .././one , /a/b/c/d   => /a/b/c/one
      const allSegments = baseSegments.concat(toSegments);
      const segments = [];

      allSegments.forEach(segment => {
        if (segment === "..") {
          segments.pop();
        } else if (segment !== ".") {
          segments.push(segment);
        }
      });

      return addQuery("/" + segments.join("/"), toQuery);
    }

    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    function combinePaths(basepath, path) {
      return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
    }

    /**
     * Decides whether a given `event` should result in a navigation or not.
     * @param {object} event
     */
    function shouldNavigate(event) {
      return (
        !event.defaultPrevented &&
        event.button === 0 &&
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
      );
    }

    /* Users/luismanzanero/Projects/real-time-games/node_modules/svelte-routing/src/Router.svelte generated by Svelte v3.24.1 */

    function create_fragment$1(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 32) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[5], dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $base;
    	let $location;
    	let $routes;
    	let { basepath = "/" } = $$props;
    	let { url = null } = $$props;
    	const locationContext = getContext(LOCATION);
    	const routerContext = getContext(ROUTER);
    	const routes = writable([]);
    	validate_store(routes, "routes");
    	component_subscribe($$self, routes, value => $$invalidate(10, $routes = value));
    	const activeRoute = writable(null);
    	let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

    	// If locationContext is not set, this is the topmost Router in the tree.
    	// If the `url` prop is given we force the location to it.
    	const location = locationContext || writable(url ? { pathname: url } : globalHistory.location);

    	validate_store(location, "location");
    	component_subscribe($$self, location, value => $$invalidate(9, $location = value));

    	// If routerContext is set, the routerBase of the parent Router
    	// will be the base for this Router's descendants.
    	// If routerContext is not set, the path and resolved uri will both
    	// have the value of the basepath prop.
    	const base = routerContext
    	? routerContext.routerBase
    	: writable({ path: basepath, uri: basepath });

    	validate_store(base, "base");
    	component_subscribe($$self, base, value => $$invalidate(8, $base = value));

    	const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
    		// If there is no activeRoute, the routerBase will be identical to the base.
    		if (activeRoute === null) {
    			return base;
    		}

    		const { path: basepath } = base;
    		const { route, uri } = activeRoute;

    		// Remove the potential /* or /*splatname from
    		// the end of the child Routes relative paths.
    		const path = route.default
    		? basepath
    		: route.path.replace(/\*.*$/, "");

    		return { path, uri };
    	});

    	function registerRoute(route) {
    		const { path: basepath } = $base;
    		let { path } = route;

    		// We store the original path in the _path property so we can reuse
    		// it when the basepath changes. The only thing that matters is that
    		// the route reference is intact, so mutation is fine.
    		route._path = path;

    		route.path = combinePaths(basepath, path);

    		if (typeof window === "undefined") {
    			// In SSR we should set the activeRoute immediately if it is a match.
    			// If there are more Routes being registered after a match is found,
    			// we just skip them.
    			if (hasActiveRoute) {
    				return;
    			}

    			const matchingRoute = match(route, $location.pathname);

    			if (matchingRoute) {
    				activeRoute.set(matchingRoute);
    				hasActiveRoute = true;
    			}
    		} else {
    			routes.update(rs => {
    				rs.push(route);
    				return rs;
    			});
    		}
    	}

    	function unregisterRoute(route) {
    		routes.update(rs => {
    			const index = rs.indexOf(route);
    			rs.splice(index, 1);
    			return rs;
    		});
    	}

    	if (!locationContext) {
    		// The topmost Router in the tree is responsible for updating
    		// the location store and supplying it through context.
    		onMount(() => {
    			const unlisten = globalHistory.listen(history => {
    				location.set(history.location);
    			});

    			return unlisten;
    		});

    		setContext(LOCATION, location);
    	}

    	setContext(ROUTER, {
    		activeRoute,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute
    	});

    	const writable_props = ["basepath", "url"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Router", $$slots, ['default']);

    	$$self.$$set = $$props => {
    		if ("basepath" in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ("url" in $$props) $$invalidate(4, url = $$props.url);
    		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		setContext,
    		onMount,
    		writable,
    		derived,
    		LOCATION,
    		ROUTER,
    		globalHistory,
    		pick,
    		match,
    		stripSlashes,
    		combinePaths,
    		basepath,
    		url,
    		locationContext,
    		routerContext,
    		routes,
    		activeRoute,
    		hasActiveRoute,
    		location,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute,
    		$base,
    		$location,
    		$routes
    	});

    	$$self.$inject_state = $$props => {
    		if ("basepath" in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ("url" in $$props) $$invalidate(4, url = $$props.url);
    		if ("hasActiveRoute" in $$props) hasActiveRoute = $$props.hasActiveRoute;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$base*/ 256) {
    			// This reactive statement will update all the Routes' path when
    			// the basepath changes.
    			 {
    				const { path: basepath } = $base;

    				routes.update(rs => {
    					rs.forEach(r => r.path = combinePaths(basepath, r._path));
    					return rs;
    				});
    			}
    		}

    		if ($$self.$$.dirty & /*$routes, $location*/ 1536) {
    			// This reactive statement will be run when the Router is created
    			// when there are no Routes and then again the following tick, so it
    			// will not find an active Route in SSR and in the browser it will only
    			// pick an active Route after all Routes have been registered.
    			 {
    				const bestMatch = pick($routes, $location.pathname);
    				activeRoute.set(bestMatch);
    			}
    		}
    	};

    	return [routes, location, base, basepath, url, $$scope, $$slots];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { basepath: 3, url: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* Users/luismanzanero/Projects/real-time-games/node_modules/svelte-routing/src/Route.svelte generated by Svelte v3.24.1 */

    const get_default_slot_changes = dirty => ({
    	params: dirty & /*routeParams*/ 2,
    	location: dirty & /*$location*/ 16
    });

    const get_default_slot_context = ctx => ({
    	params: /*routeParams*/ ctx[1],
    	location: /*$location*/ ctx[4]
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1$1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*component*/ ctx[0] !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(40:0) {#if $activeRoute !== null && $activeRoute.route === route}",
    		ctx
    	});

    	return block;
    }

    // (43:2) {:else}
    function create_else_block(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope, routeParams, $location*/ 530) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[9], dirty, get_default_slot_changes, get_default_slot_context);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(43:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (41:2) {#if component !== null}
    function create_if_block_1$1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;

    	const switch_instance_spread_levels = [
    		{ location: /*$location*/ ctx[4] },
    		/*routeParams*/ ctx[1],
    		/*routeProps*/ ctx[2]
    	];

    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*$location, routeParams, routeProps*/ 22)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*$location*/ 16 && { location: /*$location*/ ctx[4] },
    					dirty & /*routeParams*/ 2 && get_spread_object(/*routeParams*/ ctx[1]),
    					dirty & /*routeProps*/ 4 && get_spread_object(/*routeProps*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(41:2) {#if component !== null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$activeRoute*/ ctx[3] !== null && /*$activeRoute*/ ctx[3].route === /*route*/ ctx[7] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$activeRoute*/ ctx[3] !== null && /*$activeRoute*/ ctx[3].route === /*route*/ ctx[7]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$activeRoute*/ 8) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $activeRoute;
    	let $location;
    	let { path = "" } = $$props;
    	let { component = null } = $$props;
    	const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER);
    	validate_store(activeRoute, "activeRoute");
    	component_subscribe($$self, activeRoute, value => $$invalidate(3, $activeRoute = value));
    	const location = getContext(LOCATION);
    	validate_store(location, "location");
    	component_subscribe($$self, location, value => $$invalidate(4, $location = value));

    	const route = {
    		path,
    		// If no path prop is given, this Route will act as the default Route
    		// that is rendered if no other Route in the Router is a match.
    		default: path === ""
    	};

    	let routeParams = {};
    	let routeProps = {};
    	registerRoute(route);

    	// There is no need to unregister Routes in SSR since it will all be
    	// thrown away anyway.
    	if (typeof window !== "undefined") {
    		onDestroy(() => {
    			unregisterRoute(route);
    		});
    	}

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Route", $$slots, ['default']);

    	$$self.$$set = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("path" in $$new_props) $$invalidate(8, path = $$new_props.path);
    		if ("component" in $$new_props) $$invalidate(0, component = $$new_props.component);
    		if ("$$scope" in $$new_props) $$invalidate(9, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		onDestroy,
    		ROUTER,
    		LOCATION,
    		path,
    		component,
    		registerRoute,
    		unregisterRoute,
    		activeRoute,
    		location,
    		route,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), $$new_props));
    		if ("path" in $$props) $$invalidate(8, path = $$new_props.path);
    		if ("component" in $$props) $$invalidate(0, component = $$new_props.component);
    		if ("routeParams" in $$props) $$invalidate(1, routeParams = $$new_props.routeParams);
    		if ("routeProps" in $$props) $$invalidate(2, routeProps = $$new_props.routeProps);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$activeRoute*/ 8) {
    			 if ($activeRoute && $activeRoute.route === route) {
    				$$invalidate(1, routeParams = $activeRoute.params);
    			}
    		}

    		 {
    			const { path, component, ...rest } = $$props;
    			$$invalidate(2, routeProps = rest);
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		component,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location,
    		activeRoute,
    		location,
    		route,
    		path,
    		$$scope,
    		$$slots
    	];
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { path: 8, component: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* Users/luismanzanero/Projects/real-time-games/node_modules/svelte-routing/src/Link.svelte generated by Svelte v3.24.1 */
    const file$1 = "Users/luismanzanero/Projects/real-time-games/node_modules/svelte-routing/src/Link.svelte";

    function create_fragment$3(ctx) {
    	let a;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);

    	let a_levels = [
    		{ href: /*href*/ ctx[0] },
    		{ "aria-current": /*ariaCurrent*/ ctx[2] },
    		/*props*/ ctx[1]
    	];

    	let a_data = {};

    	for (let i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");
    			if (default_slot) default_slot.c();
    			set_attributes(a, a_data);
    			add_location(a, file$1, 40, 0, 1249);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(a, "click", /*onClick*/ ctx[5], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1024) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			}

    			set_attributes(a, a_data = get_spread_update(a_levels, [
    				(!current || dirty & /*href*/ 1) && { href: /*href*/ ctx[0] },
    				(!current || dirty & /*ariaCurrent*/ 4) && { "aria-current": /*ariaCurrent*/ ctx[2] },
    				dirty & /*props*/ 2 && /*props*/ ctx[1]
    			]));
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $base;
    	let $location;
    	let { to = "#" } = $$props;
    	let { replace = false } = $$props;
    	let { state = {} } = $$props;
    	let { getProps = () => ({}) } = $$props;
    	const { base } = getContext(ROUTER);
    	validate_store(base, "base");
    	component_subscribe($$self, base, value => $$invalidate(14, $base = value));
    	const location = getContext(LOCATION);
    	validate_store(location, "location");
    	component_subscribe($$self, location, value => $$invalidate(15, $location = value));
    	const dispatch = createEventDispatcher();
    	let href, isPartiallyCurrent, isCurrent, props;

    	function onClick(event) {
    		dispatch("click", event);

    		if (shouldNavigate(event)) {
    			event.preventDefault();

    			// Don't push another entry to the history stack when the user
    			// clicks on a Link to the page they are currently on.
    			const shouldReplace = $location.pathname === href || replace;

    			navigate(href, { state, replace: shouldReplace });
    		}
    	}

    	const writable_props = ["to", "replace", "state", "getProps"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Link> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Link", $$slots, ['default']);

    	$$self.$$set = $$props => {
    		if ("to" in $$props) $$invalidate(6, to = $$props.to);
    		if ("replace" in $$props) $$invalidate(7, replace = $$props.replace);
    		if ("state" in $$props) $$invalidate(8, state = $$props.state);
    		if ("getProps" in $$props) $$invalidate(9, getProps = $$props.getProps);
    		if ("$$scope" in $$props) $$invalidate(10, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		createEventDispatcher,
    		ROUTER,
    		LOCATION,
    		navigate,
    		startsWith,
    		resolve,
    		shouldNavigate,
    		to,
    		replace,
    		state,
    		getProps,
    		base,
    		location,
    		dispatch,
    		href,
    		isPartiallyCurrent,
    		isCurrent,
    		props,
    		onClick,
    		$base,
    		$location,
    		ariaCurrent
    	});

    	$$self.$inject_state = $$props => {
    		if ("to" in $$props) $$invalidate(6, to = $$props.to);
    		if ("replace" in $$props) $$invalidate(7, replace = $$props.replace);
    		if ("state" in $$props) $$invalidate(8, state = $$props.state);
    		if ("getProps" in $$props) $$invalidate(9, getProps = $$props.getProps);
    		if ("href" in $$props) $$invalidate(0, href = $$props.href);
    		if ("isPartiallyCurrent" in $$props) $$invalidate(12, isPartiallyCurrent = $$props.isPartiallyCurrent);
    		if ("isCurrent" in $$props) $$invalidate(13, isCurrent = $$props.isCurrent);
    		if ("props" in $$props) $$invalidate(1, props = $$props.props);
    		if ("ariaCurrent" in $$props) $$invalidate(2, ariaCurrent = $$props.ariaCurrent);
    	};

    	let ariaCurrent;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*to, $base*/ 16448) {
    			 $$invalidate(0, href = to === "/" ? $base.uri : resolve(to, $base.uri));
    		}

    		if ($$self.$$.dirty & /*$location, href*/ 32769) {
    			 $$invalidate(12, isPartiallyCurrent = startsWith($location.pathname, href));
    		}

    		if ($$self.$$.dirty & /*href, $location*/ 32769) {
    			 $$invalidate(13, isCurrent = href === $location.pathname);
    		}

    		if ($$self.$$.dirty & /*isCurrent*/ 8192) {
    			 $$invalidate(2, ariaCurrent = isCurrent ? "page" : undefined);
    		}

    		if ($$self.$$.dirty & /*getProps, $location, href, isPartiallyCurrent, isCurrent*/ 45569) {
    			 $$invalidate(1, props = getProps({
    				location: $location,
    				href,
    				isPartiallyCurrent,
    				isCurrent
    			}));
    		}
    	};

    	return [
    		href,
    		props,
    		ariaCurrent,
    		base,
    		location,
    		onClick,
    		to,
    		replace,
    		state,
    		getProps,
    		$$scope,
    		$$slots
    	];
    }

    class Link extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { to: 6, replace: 7, state: 8, getProps: 9 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Link",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get to() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set to(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get replace() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set replace(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get state() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set state(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getProps() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getProps(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/tictactoe.svelte generated by Svelte v3.24.1 */

    const { console: console_1 } = globals;
    const file$2 = "src/components/tictactoe.svelte";

    function create_fragment$4(ctx) {
    	let div0;
    	let button0;
    	let t1;
    	let input0;
    	let t2;
    	let input1;
    	let t3;
    	let button1;
    	let t5;
    	let ul;
    	let t6;
    	let div10;
    	let div1;
    	let t7;
    	let div2;
    	let t8;
    	let div3;
    	let t9;
    	let div4;
    	let t10;
    	let div5;
    	let t11;
    	let div6;
    	let t12;
    	let div7;
    	let t13;
    	let div8;
    	let t14;
    	let div9;
    	let t15;
    	let div12;
    	let div11;
    	let t16;
    	let button2;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "Generate Room";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			input1 = element("input");
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "Enter Game";
    			t5 = space();
    			ul = element("ul");
    			t6 = space();
    			div10 = element("div");
    			div1 = element("div");
    			t7 = space();
    			div2 = element("div");
    			t8 = space();
    			div3 = element("div");
    			t9 = space();
    			div4 = element("div");
    			t10 = space();
    			div5 = element("div");
    			t11 = space();
    			div6 = element("div");
    			t12 = space();
    			div7 = element("div");
    			t13 = space();
    			div8 = element("div");
    			t14 = space();
    			div9 = element("div");
    			t15 = space();
    			div12 = element("div");
    			div11 = element("div");
    			t16 = space();
    			button2 = element("button");
    			button2.textContent = "Restart";
    			attr_dev(button0, "class", "btn svelte-42t46v");
    			add_location(button0, file$2, 153, 2, 4101);
    			attr_dev(input0, "id", "user-name");
    			attr_dev(input0, "class", "svelte-42t46v");
    			add_location(input0, file$2, 154, 2, 4146);
    			attr_dev(input1, "id", "room-name");
    			attr_dev(input1, "class", "svelte-42t46v");
    			add_location(input1, file$2, 155, 2, 4172);
    			attr_dev(button1, "class", "btn svelte-42t46v");
    			attr_dev(button1, "id", "enter-game");
    			add_location(button1, file$2, 156, 2, 4198);
    			attr_dev(ul, "id", "users");
    			attr_dev(ul, "class", "svelte-42t46v");
    			add_location(ul, file$2, 157, 2, 4256);
    			attr_dev(div0, "class", "container svelte-42t46v");
    			add_location(div0, file$2, 152, 0, 4074);
    			attr_dev(div1, "class", "cell svelte-42t46v");
    			attr_dev(div1, "data-cell", "");
    			add_location(div1, file$2, 160, 2, 4317);
    			attr_dev(div2, "class", "cell svelte-42t46v");
    			attr_dev(div2, "data-cell", "");
    			add_location(div2, file$2, 161, 2, 4354);
    			attr_dev(div3, "class", "cell svelte-42t46v");
    			attr_dev(div3, "data-cell", "");
    			add_location(div3, file$2, 162, 2, 4391);
    			attr_dev(div4, "class", "cell svelte-42t46v");
    			attr_dev(div4, "data-cell", "");
    			add_location(div4, file$2, 163, 2, 4428);
    			attr_dev(div5, "class", "cell svelte-42t46v");
    			attr_dev(div5, "data-cell", "");
    			add_location(div5, file$2, 164, 2, 4465);
    			attr_dev(div6, "class", "cell svelte-42t46v");
    			attr_dev(div6, "data-cell", "");
    			add_location(div6, file$2, 165, 2, 4502);
    			attr_dev(div7, "class", "cell svelte-42t46v");
    			attr_dev(div7, "data-cell", "");
    			add_location(div7, file$2, 166, 2, 4539);
    			attr_dev(div8, "class", "cell svelte-42t46v");
    			attr_dev(div8, "data-cell", "");
    			add_location(div8, file$2, 167, 2, 4576);
    			attr_dev(div9, "class", "cell svelte-42t46v");
    			attr_dev(div9, "data-cell", "");
    			add_location(div9, file$2, 168, 2, 4613);
    			attr_dev(div10, "class", "board svelte-42t46v");
    			attr_dev(div10, "id", "board");
    			add_location(div10, file$2, 159, 0, 4284);
    			attr_dev(div11, "data-winning-message-text", "");
    			attr_dev(div11, "class", "svelte-42t46v");
    			add_location(div11, file$2, 171, 2, 4707);
    			attr_dev(button2, "id", "restartButton");
    			attr_dev(button2, "class", "svelte-42t46v");
    			add_location(button2, file$2, 172, 2, 4747);
    			attr_dev(div12, "class", "winning-message svelte-42t46v");
    			attr_dev(div12, "id", "winningMessage");
    			add_location(div12, file$2, 170, 0, 4655);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, button0);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			append_dev(div0, t2);
    			append_dev(div0, input1);
    			append_dev(div0, t3);
    			append_dev(div0, button1);
    			append_dev(div0, t5);
    			append_dev(div0, ul);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div10, anchor);
    			append_dev(div10, div1);
    			append_dev(div10, t7);
    			append_dev(div10, div2);
    			append_dev(div10, t8);
    			append_dev(div10, div3);
    			append_dev(div10, t9);
    			append_dev(div10, div4);
    			append_dev(div10, t10);
    			append_dev(div10, div5);
    			append_dev(div10, t11);
    			append_dev(div10, div6);
    			append_dev(div10, t12);
    			append_dev(div10, div7);
    			append_dev(div10, t13);
    			append_dev(div10, div8);
    			append_dev(div10, t14);
    			append_dev(div10, div9);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, div12, anchor);
    			append_dev(div12, div11);
    			append_dev(div12, t16);
    			append_dev(div12, button2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div10);
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(div12);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const X_CLASS = "x";
    const CIRCLE_CLASS = "circle";

    function placeMark(cell, currentClass) {
    	cell.classList.add(currentClass);
    }

    function instance$4($$self, $$props, $$invalidate) {
    	const WINNING_COMBINATIONS = [
    		[0, 1, 2],
    		[3, 4, 5],
    		[6, 7, 8],
    		[0, 3, 6],
    		[1, 4, 7],
    		[2, 5, 8],
    		[0, 4, 8],
    		[2, 4, 6]
    	];

    	const cellElements = document.querySelectorAll("[data-cell]");
    	const board = document.getElementById("board");
    	const winningMessageElement = document.getElementById("winningMessage");
    	const restartButton = document.getElementById("restartButton");
    	const winningMessageTextElement = document.querySelector("[data-winning-message-text]");
    	const generateRoomBtn = document.querySelector(".btn");
    	const userName = document.querySelector("#user-name");
    	const roomId = document.querySelector("#room-name");
    	const userList = document.getElementById("users");
    	const enterGame = document.querySelector("#enter-game");
    	let circleTurn;
    	const socket = io();
    	console.log(socket);

    	socket.on("winner", winner => {
    		console.log(winner);
    		winningMessageTextElement.innerHTML = winner;
    		winningMessageElement.classList.add("show");
    	});

    	socket.emit("restartGame", () => {
    		console.log("game restarted");
    	});

    	socket.on("cell", ({ currentCellIndex, currentClass }) => {
    		console.log(currentCellIndex, currentClass, "From on Cell socket");
    		cellElements[currentCellIndex].classList.add(currentClass);
    	});

    	startGame();
    	restartButton.addEventListener("click", startGame);

    	generateRoomBtn.addEventListener("click", () => {
    		roomId.value = `${new Date().getMilliseconds()}`;
    	});

    	roomId.addEventListener("click", () => {
    		roomId.select();
    		document.execCommand("copy");
    	});

    	enterGame.addEventListener("click", () => {
    		socket.emit("joinGame", {
    			userName: userName.value,
    			roomId: roomId.value
    		});
    	}); // Get room and users
    	//  socket.on('roomUsers', ({ room, users }) => {
    	//   console.log(room, users, "from tic tac toe.js");
    	//   // outputUsers(users);

    	//  });
    	// socket.on('message', game => {
    	//   console.log(`${game} created`);
    	// });
    	// Add users to DOM
    	function outputUsers(users) {
    		userList.innerHTML = `
    ${users.map(user => `<li>${user.username}</li>`).join("")}
  `;
    	}

    	function startGame() {
    		circleTurn = false;

    		cellElements.forEach(cell => {
    			cell.classList.remove(X_CLASS);
    			cell.classList.remove(CIRCLE_CLASS);
    			cell.removeEventListener("click", handleClick);
    			cell.addEventListener("click", handleClick, { once: true });
    		});

    		setBoardHoverClass();
    		winningMessageElement.classList.remove("show");
    	}

    	function handleClick(e, index) {
    		console.log(index, "Index of Element");
    		const cell = e.target;
    		const currentCellIndex = Array.from(cellElements).indexOf(cell);
    		const currentClass = circleTurn ? CIRCLE_CLASS : X_CLASS;

    		// Emit message to server
    		placeMark(cell, currentClass);

    		socket.emit("userPick", { currentCellIndex, currentClass });

    		if (checkWin(currentClass)) {
    			endGame(false);
    		} else if (isDraw()) {
    			endGame(true);
    		} else {
    			swapTurns();
    			setBoardHoverClass();
    		}
    	}

    	function endGame(draw) {
    		if (draw) {
    			winningMessageTextElement.innerText = "Draw!";
    			socket.emit("endGame", winningMessageTextElement.innerText);
    		} else {
    			winningMessageTextElement.innerText = `${circleTurn ? "O's" : "X's"} Wins!`;
    			socket.emit("endGame", winningMessageTextElement.innerText);
    		}

    		winningMessageElement.classList.add("show");
    	}

    	function isDraw() {
    		return [...cellElements].every(cell => {
    			return cell.classList.contains(X_CLASS) || cell.classList.contains(CIRCLE_CLASS);
    		});
    	}

    	function swapTurns() {
    		circleTurn = !circleTurn;
    	}

    	function setBoardHoverClass() {
    		board.classList.remove(X_CLASS);
    		board.classList.remove(CIRCLE_CLASS);

    		if (circleTurn) {
    			board.classList.add(CIRCLE_CLASS);
    		} else {
    			board.classList.add(X_CLASS);
    		}
    	}

    	function checkWin(currentClass) {
    		return WINNING_COMBINATIONS.some(combination => {
    			return combination.every(index => {
    				return cellElements[index].classList.contains(currentClass);
    			});
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Tictactoe> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Tictactoe", $$slots, []);

    	$$self.$capture_state = () => ({
    		X_CLASS,
    		CIRCLE_CLASS,
    		WINNING_COMBINATIONS,
    		cellElements,
    		board,
    		winningMessageElement,
    		restartButton,
    		winningMessageTextElement,
    		generateRoomBtn,
    		userName,
    		roomId,
    		userList,
    		enterGame,
    		circleTurn,
    		socket,
    		outputUsers,
    		startGame,
    		handleClick,
    		endGame,
    		isDraw,
    		placeMark,
    		swapTurns,
    		setBoardHoverClass,
    		checkWin
    	});

    	$$self.$inject_state = $$props => {
    		if ("circleTurn" in $$props) circleTurn = $$props.circleTurn;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [];
    }

    class Tictactoe extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tictactoe",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/pages/home.svelte generated by Svelte v3.24.1 */
    const file$3 = "src/pages/home.svelte";

    // (12:37) <Link to="/tic-tac-toe">
    function create_default_slot_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Play now");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(12:37) <Link to=\\\"/tic-tac-toe\\\">",
    		ctx
    	});

    	return block;
    }

    // (22:37) <Link to="/vocab-quiz">
    function create_default_slot(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Play now");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(22:37) <Link to=\\\"/vocab-quiz\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let h1;
    	let t1;
    	let ul;
    	let li0;
    	let div2;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t2;
    	let div1;
    	let h20;
    	let t4;
    	let p0;
    	let t6;
    	let button0;
    	let link0;
    	let t7;
    	let li1;
    	let div5;
    	let div3;
    	let img1;
    	let img1_src_value;
    	let t8;
    	let div4;
    	let h21;
    	let t10;
    	let p1;
    	let t12;
    	let button1;
    	let link1;
    	let t13;
    	let li2;
    	let div8;
    	let div6;
    	let img2;
    	let img2_src_value;
    	let t14;
    	let div7;
    	let h22;
    	let t16;
    	let p2;
    	let t18;
    	let button2;
    	let t20;
    	let li3;
    	let div11;
    	let div9;
    	let img3;
    	let img3_src_value;
    	let t21;
    	let div10;
    	let h23;
    	let t23;
    	let p3;
    	let t25;
    	let button3;
    	let t27;
    	let li4;
    	let div14;
    	let div12;
    	let img4;
    	let img4_src_value;
    	let t28;
    	let div13;
    	let h24;
    	let t30;
    	let p4;
    	let t32;
    	let button4;
    	let t34;
    	let li5;
    	let div17;
    	let div15;
    	let img5;
    	let img5_src_value;
    	let t35;
    	let div16;
    	let h25;
    	let t37;
    	let p5;
    	let t39;
    	let button5;
    	let current;

    	link0 = new Link({
    			props: {
    				to: "/tic-tac-toe",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	link1 = new Link({
    			props: {
    				to: "/vocab-quiz",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Real Time Games";
    			t1 = space();
    			ul = element("ul");
    			li0 = element("li");
    			div2 = element("div");
    			div0 = element("div");
    			img0 = element("img");
    			t2 = space();
    			div1 = element("div");
    			h20 = element("h2");
    			h20.textContent = "Tic Tac Toe";
    			t4 = space();
    			p0 = element("p");
    			p0.textContent = "Demo of pixel perfect pure CSS simple responsive card grid layout";
    			t6 = space();
    			button0 = element("button");
    			create_component(link0.$$.fragment);
    			t7 = space();
    			li1 = element("li");
    			div5 = element("div");
    			div3 = element("div");
    			img1 = element("img");
    			t8 = space();
    			div4 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Battle Ship";
    			t10 = space();
    			p1 = element("p");
    			p1.textContent = "Demo of pixel perfect pure CSS simple responsive card grid layout";
    			t12 = space();
    			button1 = element("button");
    			create_component(link1.$$.fragment);
    			t13 = space();
    			li2 = element("li");
    			div8 = element("div");
    			div6 = element("div");
    			img2 = element("img");
    			t14 = space();
    			div7 = element("div");
    			h22 = element("h2");
    			h22.textContent = "Hang Man";
    			t16 = space();
    			p2 = element("p");
    			p2.textContent = "Demo of pixel perfect pure CSS simple responsive card grid layout";
    			t18 = space();
    			button2 = element("button");
    			button2.textContent = "Play now";
    			t20 = space();
    			li3 = element("li");
    			div11 = element("div");
    			div9 = element("div");
    			img3 = element("img");
    			t21 = space();
    			div10 = element("div");
    			h23 = element("h2");
    			h23.textContent = "Vocabulary Quiz";
    			t23 = space();
    			p3 = element("p");
    			p3.textContent = "Demo of pixel perfect pure CSS simple responsive card grid layout";
    			t25 = space();
    			button3 = element("button");
    			button3.textContent = "Play now";
    			t27 = space();
    			li4 = element("li");
    			div14 = element("div");
    			div12 = element("div");
    			img4 = element("img");
    			t28 = space();
    			div13 = element("div");
    			h24 = element("h2");
    			h24.textContent = "Space Invadors";
    			t30 = space();
    			p4 = element("p");
    			p4.textContent = "Demo of pixel perfect pure CSS simple responsive card grid layout";
    			t32 = space();
    			button4 = element("button");
    			button4.textContent = "Play now";
    			t34 = space();
    			li5 = element("li");
    			div17 = element("div");
    			div15 = element("div");
    			img5 = element("img");
    			t35 = space();
    			div16 = element("div");
    			h25 = element("h2");
    			h25.textContent = "Card Grid Layout";
    			t37 = space();
    			p5 = element("p");
    			p5.textContent = "Demo of pixel perfect pure CSS simple responsive card grid layout";
    			t39 = space();
    			button5 = element("button");
    			button5.textContent = "Play now";
    			attr_dev(h1, "class", "svelte-1apro5l");
    			add_location(h1, file$3, 3, 0, 76);
    			if (img0.src !== (img0_src_value = "https://picsum.photos/500/300/?image=10")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Tic Tac Toe");
    			attr_dev(img0, "loading", "lazy");
    			attr_dev(img0, "class", "svelte-1apro5l");
    			add_location(img0, file$3, 7, 30, 201);
    			attr_dev(div0, "class", "card_image");
    			add_location(div0, file$3, 7, 6, 177);
    			attr_dev(h20, "class", "card_title svelte-1apro5l");
    			add_location(h20, file$3, 9, 8, 333);
    			attr_dev(p0, "class", "card_text svelte-1apro5l");
    			add_location(p0, file$3, 10, 8, 381);
    			attr_dev(button0, "class", "btn card_btn svelte-1apro5l");
    			add_location(button0, file$3, 11, 8, 480);
    			attr_dev(div1, "class", "card_content svelte-1apro5l");
    			add_location(div1, file$3, 8, 6, 298);
    			attr_dev(div2, "class", "card svelte-1apro5l");
    			add_location(div2, file$3, 6, 4, 152);
    			attr_dev(li0, "class", "cards_item svelte-1apro5l");
    			add_location(li0, file$3, 5, 2, 124);
    			if (img1.src !== (img1_src_value = "https://picsum.photos/500/300/?image=5")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "battle ship");
    			attr_dev(img1, "loading", "lazy");
    			attr_dev(img1, "class", "svelte-1apro5l");
    			add_location(img1, file$3, 17, 30, 669);
    			attr_dev(div3, "class", "card_image");
    			add_location(div3, file$3, 17, 6, 645);
    			attr_dev(h21, "class", "card_title svelte-1apro5l");
    			add_location(h21, file$3, 19, 8, 800);
    			attr_dev(p1, "class", "card_text svelte-1apro5l");
    			add_location(p1, file$3, 20, 8, 848);
    			attr_dev(button1, "class", "btn card_btn svelte-1apro5l");
    			add_location(button1, file$3, 21, 8, 947);
    			attr_dev(div4, "class", "card_content svelte-1apro5l");
    			add_location(div4, file$3, 18, 6, 765);
    			attr_dev(div5, "class", "card svelte-1apro5l");
    			add_location(div5, file$3, 16, 4, 620);
    			attr_dev(li1, "class", "cards_item svelte-1apro5l");
    			add_location(li1, file$3, 15, 2, 592);
    			if (img2.src !== (img2_src_value = "https://picsum.photos/500/300/?image=11")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "Hang Man");
    			attr_dev(img2, "loading", "lazy");
    			attr_dev(img2, "class", "svelte-1apro5l");
    			add_location(img2, file$3, 27, 30, 1136);
    			attr_dev(div6, "class", "card_image");
    			add_location(div6, file$3, 27, 6, 1112);
    			attr_dev(h22, "class", "card_title svelte-1apro5l");
    			add_location(h22, file$3, 29, 8, 1265);
    			attr_dev(p2, "class", "card_text svelte-1apro5l");
    			add_location(p2, file$3, 30, 8, 1310);
    			attr_dev(button2, "class", "btn card_btn svelte-1apro5l");
    			add_location(button2, file$3, 31, 8, 1409);
    			attr_dev(div7, "class", "card_content svelte-1apro5l");
    			add_location(div7, file$3, 28, 6, 1230);
    			attr_dev(div8, "class", "card svelte-1apro5l");
    			add_location(div8, file$3, 26, 4, 1087);
    			attr_dev(li2, "class", "cards_item svelte-1apro5l");
    			add_location(li2, file$3, 25, 2, 1059);
    			if (img3.src !== (img3_src_value = "https://picsum.photos/500/300/?image=14")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "Vocabluarly Quiz");
    			attr_dev(img3, "loading", "lazy");
    			attr_dev(img3, "class", "svelte-1apro5l");
    			add_location(img3, file$3, 37, 30, 1567);
    			attr_dev(div9, "class", "card_image");
    			add_location(div9, file$3, 37, 6, 1543);
    			attr_dev(h23, "class", "card_title svelte-1apro5l");
    			add_location(h23, file$3, 39, 8, 1704);
    			attr_dev(p3, "class", "card_text svelte-1apro5l");
    			add_location(p3, file$3, 40, 8, 1756);
    			attr_dev(button3, "class", "btn card_btn svelte-1apro5l");
    			add_location(button3, file$3, 41, 8, 1855);
    			attr_dev(div10, "class", "card_content svelte-1apro5l");
    			add_location(div10, file$3, 38, 6, 1669);
    			attr_dev(div11, "class", "card svelte-1apro5l");
    			add_location(div11, file$3, 36, 4, 1518);
    			attr_dev(li3, "class", "cards_item svelte-1apro5l");
    			add_location(li3, file$3, 35, 2, 1490);
    			if (img4.src !== (img4_src_value = "https://picsum.photos/500/300/?image=17")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "Space invadors");
    			attr_dev(img4, "loading", "lazy");
    			attr_dev(img4, "class", "svelte-1apro5l");
    			add_location(img4, file$3, 47, 30, 2013);
    			attr_dev(div12, "class", "card_image");
    			add_location(div12, file$3, 47, 6, 1989);
    			attr_dev(h24, "class", "card_title svelte-1apro5l");
    			add_location(h24, file$3, 49, 8, 2148);
    			attr_dev(p4, "class", "card_text svelte-1apro5l");
    			add_location(p4, file$3, 50, 8, 2199);
    			attr_dev(button4, "class", "btn card_btn svelte-1apro5l");
    			add_location(button4, file$3, 51, 8, 2298);
    			attr_dev(div13, "class", "card_content svelte-1apro5l");
    			add_location(div13, file$3, 48, 6, 2113);
    			attr_dev(div14, "class", "card svelte-1apro5l");
    			add_location(div14, file$3, 46, 4, 1964);
    			attr_dev(li4, "class", "cards_item svelte-1apro5l");
    			add_location(li4, file$3, 45, 2, 1936);
    			if (img5.src !== (img5_src_value = "https://picsum.photos/500/300/?image=2")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "Something");
    			attr_dev(img5, "loading", "lazy");
    			attr_dev(img5, "class", "svelte-1apro5l");
    			add_location(img5, file$3, 57, 30, 2456);
    			attr_dev(div15, "class", "card_image");
    			add_location(div15, file$3, 57, 6, 2432);
    			attr_dev(h25, "class", "card_title svelte-1apro5l");
    			add_location(h25, file$3, 59, 8, 2585);
    			attr_dev(p5, "class", "card_text svelte-1apro5l");
    			add_location(p5, file$3, 60, 8, 2638);
    			attr_dev(button5, "class", "btn card_btn svelte-1apro5l");
    			add_location(button5, file$3, 61, 8, 2737);
    			attr_dev(div16, "class", "card_content svelte-1apro5l");
    			add_location(div16, file$3, 58, 6, 2550);
    			attr_dev(div17, "class", "card svelte-1apro5l");
    			add_location(div17, file$3, 56, 4, 2407);
    			attr_dev(li5, "class", "cards_item svelte-1apro5l");
    			add_location(li5, file$3, 55, 2, 2379);
    			attr_dev(ul, "class", "cards svelte-1apro5l");
    			add_location(ul, file$3, 4, 0, 103);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li0);
    			append_dev(li0, div2);
    			append_dev(div2, div0);
    			append_dev(div0, img0);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, h20);
    			append_dev(div1, t4);
    			append_dev(div1, p0);
    			append_dev(div1, t6);
    			append_dev(div1, button0);
    			mount_component(link0, button0, null);
    			append_dev(ul, t7);
    			append_dev(ul, li1);
    			append_dev(li1, div5);
    			append_dev(div5, div3);
    			append_dev(div3, img1);
    			append_dev(div5, t8);
    			append_dev(div5, div4);
    			append_dev(div4, h21);
    			append_dev(div4, t10);
    			append_dev(div4, p1);
    			append_dev(div4, t12);
    			append_dev(div4, button1);
    			mount_component(link1, button1, null);
    			append_dev(ul, t13);
    			append_dev(ul, li2);
    			append_dev(li2, div8);
    			append_dev(div8, div6);
    			append_dev(div6, img2);
    			append_dev(div8, t14);
    			append_dev(div8, div7);
    			append_dev(div7, h22);
    			append_dev(div7, t16);
    			append_dev(div7, p2);
    			append_dev(div7, t18);
    			append_dev(div7, button2);
    			append_dev(ul, t20);
    			append_dev(ul, li3);
    			append_dev(li3, div11);
    			append_dev(div11, div9);
    			append_dev(div9, img3);
    			append_dev(div11, t21);
    			append_dev(div11, div10);
    			append_dev(div10, h23);
    			append_dev(div10, t23);
    			append_dev(div10, p3);
    			append_dev(div10, t25);
    			append_dev(div10, button3);
    			append_dev(ul, t27);
    			append_dev(ul, li4);
    			append_dev(li4, div14);
    			append_dev(div14, div12);
    			append_dev(div12, img4);
    			append_dev(div14, t28);
    			append_dev(div14, div13);
    			append_dev(div13, h24);
    			append_dev(div13, t30);
    			append_dev(div13, p4);
    			append_dev(div13, t32);
    			append_dev(div13, button4);
    			append_dev(ul, t34);
    			append_dev(ul, li5);
    			append_dev(li5, div17);
    			append_dev(div17, div15);
    			append_dev(div15, img5);
    			append_dev(div17, t35);
    			append_dev(div17, div16);
    			append_dev(div16, h25);
    			append_dev(div16, t37);
    			append_dev(div16, p5);
    			append_dev(div16, t39);
    			append_dev(div16, button5);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const link0_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				link0_changes.$$scope = { dirty, ctx };
    			}

    			link0.$set(link0_changes);
    			const link1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				link1_changes.$$scope = { dirty, ctx };
    			}

    			link1.$set(link1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(link0.$$.fragment, local);
    			transition_in(link1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(link0.$$.fragment, local);
    			transition_out(link1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(ul);
    			destroy_component(link0);
    			destroy_component(link1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Home", $$slots, []);
    	$$self.$capture_state = () => ({ Router, Link, Route });
    	return [];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/components/vocabquiz.svelte generated by Svelte v3.24.1 */

    const file$4 = "src/components/vocabquiz.svelte";

    function create_fragment$6(ctx) {
    	let div4;
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let button0;
    	let t3;
    	let button1;
    	let t5;
    	let button2;
    	let t7;
    	let button3;
    	let t9;
    	let div3;
    	let button4;
    	let t11;
    	let button5;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "Question";
    			t1 = space();
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "Answer 1";
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "Answer 2";
    			t5 = space();
    			button2 = element("button");
    			button2.textContent = "Answer 3";
    			t7 = space();
    			button3 = element("button");
    			button3.textContent = "Answer 4";
    			t9 = space();
    			div3 = element("div");
    			button4 = element("button");
    			button4.textContent = "Start";
    			t11 = space();
    			button5 = element("button");
    			button5.textContent = "Next";
    			attr_dev(div0, "id", "question");
    			attr_dev(div0, "class", "svelte-1axq3r5");
    			add_location(div0, file$4, 5, 4, 93);
    			attr_dev(button0, "class", "btn svelte-1axq3r5");
    			add_location(button0, file$4, 7, 6, 180);
    			attr_dev(button1, "class", "btn svelte-1axq3r5");
    			add_location(button1, file$4, 8, 6, 224);
    			attr_dev(button2, "class", "btn svelte-1axq3r5");
    			add_location(button2, file$4, 9, 6, 268);
    			attr_dev(button3, "class", "btn svelte-1axq3r5");
    			add_location(button3, file$4, 10, 6, 312);
    			attr_dev(div1, "id", "answer-buttons");
    			attr_dev(div1, "class", "btn-grid svelte-1axq3r5");
    			add_location(div1, file$4, 6, 4, 131);
    			attr_dev(div2, "id", "question-container");
    			attr_dev(div2, "class", "hide svelte-1axq3r5");
    			add_location(div2, file$4, 4, 2, 46);
    			attr_dev(button4, "id", "start-btn");
    			attr_dev(button4, "class", "start-btn btn svelte-1axq3r5");
    			add_location(button4, file$4, 14, 4, 399);
    			attr_dev(button5, "id", "next-btn");
    			attr_dev(button5, "class", "next-btn btn hide svelte-1axq3r5");
    			add_location(button5, file$4, 15, 4, 463);
    			attr_dev(div3, "class", "controls svelte-1axq3r5");
    			add_location(div3, file$4, 13, 2, 372);
    			attr_dev(div4, "class", "container svelte-1axq3r5");
    			add_location(div4, file$4, 3, 0, 20);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div2);
    			append_dev(div2, div0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t3);
    			append_dev(div1, button1);
    			append_dev(div1, t5);
    			append_dev(div1, button2);
    			append_dev(div1, t7);
    			append_dev(div1, button3);
    			append_dev(div4, t9);
    			append_dev(div4, div3);
    			append_dev(div3, button4);
    			append_dev(div3, t11);
    			append_dev(div3, button5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Vocabquiz> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Vocabquiz", $$slots, []);
    	return [];
    }

    class Vocabquiz extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Vocabquiz",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.24.1 */
    const file$5 = "src/App.svelte";

    // (13:1) <Router>
    function create_default_slot$1(ctx) {
    	let svelteseo;
    	let t0;
    	let route0;
    	let t1;
    	let route1;
    	let t2;
    	let route2;
    	let t3;
    	let footer;
    	let p;
    	let t4;
    	let a;
    	let t6;
    	let img;
    	let img_src_value;
    	let current;

    	svelteseo = new SvelteSeo({
    			props: {
    				title: "Real Time Games | Powered by JavaScript",
    				description: "A collection of fun games that are desgin to be interactive in realtime. Share and play with or against your friends",
    				openGraph: {
    					title: "Real Time Games | Powered by JavaScript",
    					description: "A collection of fun games that are desgin to be interactive in realtime. Share and play with or against your friends",
    					url: "https://www.example.com/page",
    					type: "website",
    					images: [
    						{
    							url: "hdata:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAsVBMVEX33x4AAAD/////5x/64h7QvBlGPwj95B/33QBQSAr/6B/33hD13R79983t1h3ZxBr887fhyxuvnhVwZQ2ThRLm0BxdVAv66nr//vr++uD45Ev+/On34Sr44jXDsBimlhTHtBiDdhD775/66G3+/fP440AqJgWaixOMfhFgVww8NgcfHARTSwr552f89LovKwaAcxB2aw4SEQIlIQX99cVAOggPDgG4pxYaFwOpmRVpXg3mBp1GAAAJF0lEQVR4nO2caXeqMBBAA8QGRXGlq1qV1qX7+mz7/3/YC2pbkQkkCE3Myf3YKifXmQSSDEE2i9Oz1iQ8H/SR2vQH5+GkdXbK9EDwny9aIXJdz5Pdfi48z3VR2LoQMGyEnnsYcr/QFt+/cRo+DA5Ob43nDlocho3rA/WL8NzrRobh1ckB+0V47slVmmGj78pu4t64/QbbcHLgAVzjuROW4cnhB3CNewIbhroIUsV7yFAjwZjij6E2KbrmN1G/DSd6CVLFSdywoZsgVWxsG171dbhNxPH6V1uGmnXCNZuuiDTN0Yh1nq4Mr/XL0Qjv+tuwpWcIaRAfNoYDPUNIgzhYG77pGsJ1T6SG97qGkAYxjAwv9BWkihfUUNtxJsJtUcNQ6xiGNjqV3YiSOUVnOicpTdMzpHU3jDoimujcDaNpItJ6oImGGnQuuw0lc44GsptQMgOk+v7gvujuZzAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoMhDv5GdkMYYAeC98vEwX67uaLd9olD1PPEzfdqki6HIia1YNhbHN1a30yPFr1hUCNqSeKKBfCeaYid4PII+qr12Gs65C+azglseJRhSNBwAeqtuenU1XHMY4jJEA7fViAvlemQOQyd9nGGX8R7hXe4KhlxQ3LJ4RfRUyOMooYYfXEKWtaxr4KioCH2s3rgNo8qKIoZYv9GQNCyXhVQFIzho5AgfQiQryhkSNJugjDVP/ZJImLozIQFLeup9tdKOwgY4mYOQctaSn68ETEUGUZ/+Se5K/IbkmUuQcvqyg0iv6HzmtPQqkgNIrchzhtCeuOXGkRuQ+cur+B0eBAxxG2mwd18WWmOOvMq/O+55LkiryH5ZPh125hEy1DEwcEYCKD0SRS3IWNKMaz9piB2gt04KjCD4jX0p6DgKP5BTJ5jl2nKDiDiNsQBKDhLxnpLcYakBxDxGw6hj30ABvg7UattNVajOA3hpYse4ID91b/+XToqBBDxG/agj40gCdKh/1kECvTANbyGc+hjPnzJIzqfUCSAaE9DxiXbvho9cE0JMVRiBP1lL0O5kwZO9hppZiplIwteQ3CJZqrMgJkC7x0fnh12DkCR1xBehfqnyHNLGtxP3qCh9dFUXpF7js+Y3yp1cwfhNXSeoc9FdNtqd0buVQxwcrGmV1fZkTtL/Q+2otXzVZlJJOFfa+umGFrWU1PV/si/Xgp+cIvjoVJFJj/wr3nXMjdHp5e+goHkN8wMYsSzeskqsPfEtz+6GBG1klVkd4297B3/8lKpDimyB7xageHhcalQHIX28Z0nTkXrfahMfxSsNmE9nSa5a8rewN8gaFgX2Ol+UqNAUbQmijnHgJBdpLBCvK4t/ektTleBMOaoTRSpqnmUvn2Yq7608iLguJStmKdGmNRFMlX2kmO+Om9nJFCjOD+MffwdCOKtFKb0pCZqTsMoVcGFfhCpy6q5DWmqBvO0lY1tmhIf4fYwRNjxZ3ylYDf1sj1SWrmHYVR7gTpcY47E0WY/QwqpVXjuHW1pebq34apQaJYZyC9pM40CDFfJusxylBbEQgwphIzSZx1zWXeMogzplWqjtPehbotvO2e7CjPMeqdN1qZ/kYY0VzH7YU7WDaNYQ+rIfDHqThNDhDGjEvWWUX1TNoUb0ksyBhxJ94syDP1b6JpwnV/5lGDIqgm/lNMRcxhmh8L/B11U0mAqbEhQ9mSvBr6bUa4hZl0dj6DGVJkrwmT58pH5qhZc5zcu05AEM9Z/wP2kO9gQO5UoOk9ZTYVrpp/KezIl9dmL1YGbBa/vfsFvWPqbvadhhiJ80dIMifO5Gr3hhQS4EghKKLL1CmlGnsJ1GyVlKcbLzd0JPq8Eg4PCZ6Ix9Kl6a9nppp6qSMDVm1JGGrw9awNzC67IS7xt5jTjDyrHafcMePQq436Ia7F2QS/HMzaud24IxB/vfiJNEc6L5M+2t58T7HSHBVDpBC8+xH5teEp0wyzIZ73yXfRzKfC7W+NdRQd+vordDsmIccwAY6veYUwRX4udW+D6DHpymsdflnPgDhPbLvLZVTTddi3hSOpjxqeBDNpHsAI+GdJbefBTRIhJjVU9EuuGaTv3z83YqVDYwZ/MRfCCBxpG0TLlqVLH0ZlcyO+wDrl43RbMKPZ67Y18ekEKrvvLtGqUgvcu4PcjNlS7z907eA63Iv5KWkbZJeW2+tV9/qqmb9PsNyEDYMxCudgZ9Or5r7QF46kxP9wVWkkWO23JfZhCjOJv94TnuCqQxMImf7EXm8JDyHxzNxtgXiFSCQVzU7gfyp9cQXLMw4FIfQlEOatQTtp4yiQ5rYh+rXxH0/xQ1rYMESl72cA4amU/xfKWu1nLz2yOWBvupJL/9jNNn03uBeusB2Zb2JN3EuQ9n+YW6NnFIdYXb9JWJ0RO2+O+aBGKQ/5h8Csjm7hPTNxmUWKKbpoV8B6y9pl5DonTFqmfXTH7g8NNMBnC55LEOQ44BjxMlkIDztEfvYBJnMyynuNKcjILXwtfco84jx3OixYAwaMuY05MmY6bAi/XkXqHK1eP/vioXez4yzGUre/zSl3w5UGCm5k1e88VJOLXF7NhQGfi9dHnePE+vX15+Xh9rD7POhX6xxyZRL/VnFVZWTEdD7HQVftoIN4GdtOc2gbHyWX3c6Uarizni6PH39vR7U21ezlq10RfKB2g89ztKJfo9yJ+sDmUvdkO6k6uU9nPUeiV0LzCwPserO+FaOIW2iTVcCeopblhC51pbniGTmW3oWROka32ULMnXmgjW+uO6Lao4YXWMbyghjqnKU3SyPBN3zR1GytDe6BrEL1re234oGsQ3YeNoX2tZxBXIVwbNvQMYtQLN4b2iY6K7on9a3jV1y9Pvf7VlqGOebrO0R9DW7tpojux44a6dcVNJ9w2tEOdFN3QThrqpOje25ChPon6m6I7hnS40eGm4f0MMklDu9E//DC6/YbNNrSvTg48jJ57cmWnGdIwXh+wo+deN3aFEoZ0MjU4UEfq95DUAQxpHEPv4CRpi+/fIBnQ0LYvWiFy3QPR9GhLUdi6gFUYhpTTs9YkPB8Us79YHv3BeThpnZ0yPf4D52eMhK0BksEAAAAASUVORK5CYII=",
    							width: 850,
    							height: 650,
    							alt: "Og Image Alt"
    						}
    					]
    				}
    			},
    			$$inline: true
    		});

    	route0 = new Route({
    			props: { path: "/", component: Home },
    			$$inline: true
    		});

    	route1 = new Route({
    			props: { path: "/tic-tac-toe", component: Tictactoe },
    			$$inline: true
    		});

    	route2 = new Route({
    			props: {
    				path: "/vocab-quiz",
    				component: Vocabquiz
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(svelteseo.$$.fragment);
    			t0 = space();
    			create_component(route0.$$.fragment);
    			t1 = space();
    			create_component(route1.$$.fragment);
    			t2 = space();
    			create_component(route2.$$.fragment);
    			t3 = space();
    			footer = element("footer");
    			p = element("p");
    			t4 = text("If you would like to add games and contribute, see ");
    			a = element("a");
    			a.textContent = "here";
    			t6 = space();
    			img = element("img");
    			attr_dev(a, "href", "https://github.com/lmanzanero/real-time-games");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "class", "svelte-ey2car");
    			add_location(a, file$5, 35, 57, 4648);
    			set_style(img, "height", "20px");
    			set_style(img, "width", "20px");
    			if (img.src !== (img_src_value = "https://image.flaticon.com/icons/png/512/25/25231.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "real time games done with javascipt and node.js");
    			attr_dev(img, "class", "svelte-ey2car");
    			add_location(img, file$5, 35, 138, 4729);
    			attr_dev(p, "class", "svelte-ey2car");
    			add_location(p, file$5, 35, 3, 4594);
    			attr_dev(footer, "class", "svelte-ey2car");
    			add_location(footer, file$5, 34, 2, 4582);
    		},
    		m: function mount(target, anchor) {
    			mount_component(svelteseo, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(route0, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(route1, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(route2, target, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, p);
    			append_dev(p, t4);
    			append_dev(p, a);
    			append_dev(p, t6);
    			append_dev(p, img);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(svelteseo.$$.fragment, local);
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			transition_in(route2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(svelteseo.$$.fragment, local);
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(svelteseo, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(route0, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(route1, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(route2, detaching);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(13:1) <Router>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let main;
    	let router;
    	let current;

    	router = new Router({
    			props: {
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(router.$$.fragment);
    			attr_dev(main, "class", "svelte-ey2car");
    			add_location(main, file$5, 11, 0, 334);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(router, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const router_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(router);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { name } = $$props;
    	const writable_props = ["name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({
    		SvelteSeo,
    		Router,
    		Link,
    		Route,
    		tic: Tictactoe,
    		Home,
    		VocabQuiz: Vocabquiz,
    		Vocabquiz,
    		name
    	});

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body, 
    	hyratable: true,
    	props: {
    		name: 'Real Time Games'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
