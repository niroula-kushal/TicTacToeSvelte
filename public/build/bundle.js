
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function null_to_empty(value) {
        return value == null ? '' : value;
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
    function children(element) {
        return Array.from(element.childNodes);
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
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
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
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.1' }, detail)));
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
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
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

    /* src/GameCell.svelte generated by Svelte v3.20.1 */

    const file = "src/GameCell.svelte";

    function create_fragment(ctx) {
    	let td;
    	let td_class_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			td = element("td");

    			attr_dev(td, "class", td_class_value = "" + (null_to_empty(/*currentStatus*/ ctx[0] == 1
    			? "red"
    			: /*currentStatus*/ ctx[0] == 2 ? "green" : "") + " svelte-5qrr0k"));

    			add_location(td, file, 20, 0, 290);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, td, anchor);
    			if (remount) dispose();
    			dispose = listen_dev(td, "click", /*handleClick*/ ctx[1], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*currentStatus*/ 1 && td_class_value !== (td_class_value = "" + (null_to_empty(/*currentStatus*/ ctx[0] == 1
    			? "red"
    			: /*currentStatus*/ ctx[0] == 2 ? "green" : "") + " svelte-5qrr0k"))) {
    				attr_dev(td, "class", td_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    			dispose();
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
    	let { rowIndex } = $$props,
    		{ colIndex } = $$props,
    		{ currentStatus } = $$props,
    		{ onCellSelect } = $$props;

    	const handleClick = () => {
    		onCellSelect(rowIndex, colIndex);
    	};

    	const writable_props = ["rowIndex", "colIndex", "currentStatus", "onCellSelect"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<GameCell> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("GameCell", $$slots, []);

    	$$self.$set = $$props => {
    		if ("rowIndex" in $$props) $$invalidate(2, rowIndex = $$props.rowIndex);
    		if ("colIndex" in $$props) $$invalidate(3, colIndex = $$props.colIndex);
    		if ("currentStatus" in $$props) $$invalidate(0, currentStatus = $$props.currentStatus);
    		if ("onCellSelect" in $$props) $$invalidate(4, onCellSelect = $$props.onCellSelect);
    	};

    	$$self.$capture_state = () => ({
    		rowIndex,
    		colIndex,
    		currentStatus,
    		onCellSelect,
    		handleClick
    	});

    	$$self.$inject_state = $$props => {
    		if ("rowIndex" in $$props) $$invalidate(2, rowIndex = $$props.rowIndex);
    		if ("colIndex" in $$props) $$invalidate(3, colIndex = $$props.colIndex);
    		if ("currentStatus" in $$props) $$invalidate(0, currentStatus = $$props.currentStatus);
    		if ("onCellSelect" in $$props) $$invalidate(4, onCellSelect = $$props.onCellSelect);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [currentStatus, handleClick, rowIndex, colIndex, onCellSelect];
    }

    class GameCell extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			rowIndex: 2,
    			colIndex: 3,
    			currentStatus: 0,
    			onCellSelect: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "GameCell",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*rowIndex*/ ctx[2] === undefined && !("rowIndex" in props)) {
    			console.warn("<GameCell> was created without expected prop 'rowIndex'");
    		}

    		if (/*colIndex*/ ctx[3] === undefined && !("colIndex" in props)) {
    			console.warn("<GameCell> was created without expected prop 'colIndex'");
    		}

    		if (/*currentStatus*/ ctx[0] === undefined && !("currentStatus" in props)) {
    			console.warn("<GameCell> was created without expected prop 'currentStatus'");
    		}

    		if (/*onCellSelect*/ ctx[4] === undefined && !("onCellSelect" in props)) {
    			console.warn("<GameCell> was created without expected prop 'onCellSelect'");
    		}
    	}

    	get rowIndex() {
    		throw new Error("<GameCell>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rowIndex(value) {
    		throw new Error("<GameCell>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get colIndex() {
    		throw new Error("<GameCell>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set colIndex(value) {
    		throw new Error("<GameCell>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get currentStatus() {
    		throw new Error("<GameCell>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentStatus(value) {
    		throw new Error("<GameCell>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onCellSelect() {
    		throw new Error("<GameCell>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onCellSelect(value) {
    		throw new Error("<GameCell>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/GameBoard.svelte generated by Svelte v3.20.1 */
    const file$1 = "src/GameBoard.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	child_ctx[7] = i;
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	child_ctx[4] = i;
    	return child_ctx;
    }

    // (8:4) {#each row as col, colIndex}
    function create_each_block_1(ctx) {
    	let current;

    	const gamecell = new GameCell({
    			props: {
    				rowIndex: /*rowIndex*/ ctx[4],
    				colIndex: /*colIndex*/ ctx[7],
    				currentStatus: /*col*/ ctx[5],
    				onCellSelect: /*onCellSelect*/ ctx[1]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(gamecell.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(gamecell, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const gamecell_changes = {};
    			if (dirty & /*gameMatrix*/ 1) gamecell_changes.currentStatus = /*col*/ ctx[5];
    			if (dirty & /*onCellSelect*/ 2) gamecell_changes.onCellSelect = /*onCellSelect*/ ctx[1];
    			gamecell.$set(gamecell_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(gamecell.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(gamecell.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(gamecell, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(8:4) {#each row as col, colIndex}",
    		ctx
    	});

    	return block;
    }

    // (6:1) {#each gameMatrix as row, rowIndex}
    function create_each_block(ctx) {
    	let tr;
    	let t;
    	let current;
    	let each_value_1 = /*row*/ ctx[2];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			tr = element("tr");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			add_location(tr, file$1, 6, 2, 146);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tr, null);
    			}

    			append_dev(tr, t);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*gameMatrix, onCellSelect*/ 3) {
    				each_value_1 = /*row*/ ctx[2];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(tr, t);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(6:1) {#each gameMatrix as row, rowIndex}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let table;
    	let current;
    	let each_value = /*gameMatrix*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			table = element("table");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(table, file$1, 4, 0, 99);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(table, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*gameMatrix, onCellSelect*/ 3) {
    				each_value = /*gameMatrix*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(table, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    			destroy_each(each_blocks, detaching);
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
    	let { gameMatrix } = $$props, { onCellSelect } = $$props;
    	const writable_props = ["gameMatrix", "onCellSelect"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<GameBoard> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("GameBoard", $$slots, []);

    	$$self.$set = $$props => {
    		if ("gameMatrix" in $$props) $$invalidate(0, gameMatrix = $$props.gameMatrix);
    		if ("onCellSelect" in $$props) $$invalidate(1, onCellSelect = $$props.onCellSelect);
    	};

    	$$self.$capture_state = () => ({ GameCell, gameMatrix, onCellSelect });

    	$$self.$inject_state = $$props => {
    		if ("gameMatrix" in $$props) $$invalidate(0, gameMatrix = $$props.gameMatrix);
    		if ("onCellSelect" in $$props) $$invalidate(1, onCellSelect = $$props.onCellSelect);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [gameMatrix, onCellSelect];
    }

    class GameBoard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { gameMatrix: 0, onCellSelect: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "GameBoard",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*gameMatrix*/ ctx[0] === undefined && !("gameMatrix" in props)) {
    			console.warn("<GameBoard> was created without expected prop 'gameMatrix'");
    		}

    		if (/*onCellSelect*/ ctx[1] === undefined && !("onCellSelect" in props)) {
    			console.warn("<GameBoard> was created without expected prop 'onCellSelect'");
    		}
    	}

    	get gameMatrix() {
    		throw new Error("<GameBoard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set gameMatrix(value) {
    		throw new Error("<GameBoard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onCellSelect() {
    		throw new Error("<GameBoard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onCellSelect(value) {
    		throw new Error("<GameBoard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.20.1 */
    const file$2 = "src/App.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (92:4) {#if gameOver}
    function create_if_block(ctx) {
    	let t0;
    	let t1;
    	let button;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*winner*/ ctx[2] != null) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			t0 = text("Game Over.\n      ");
    			if_block.c();
    			t1 = space();
    			button = element("button");
    			button.textContent = "Play Again";
    			attr_dev(button, "class", "svelte-1x6nqy0");
    			add_location(button, file$2, 96, 6, 2209);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, t0, anchor);
    			if_block.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button, anchor);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*restartGame*/ ctx[6], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(t1.parentNode, t1);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if_block.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(92:4) {#if gameOver}",
    		ctx
    	});

    	return block;
    }

    // (96:6) {:else}
    function create_else_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("No more Moves Left.");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(96:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (94:6) {#if winner != null}
    function create_if_block_1(ctx) {
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text("Winner : Player ");
    			t1 = text(/*winner*/ ctx[2]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*winner*/ 4) set_data_dev(t1, /*winner*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(94:6) {#if winner != null}",
    		ctx
    	});

    	return block;
    }

    // (102:2) {#each gameMoves as move}
    function create_each_block$1(ctx) {
    	let li;
    	let t0;
    	let t1_value = /*move*/ ctx[12].player + "";
    	let t1;
    	let t2;
    	let t3_value = /*move*/ ctx[12].row + "";
    	let t3;
    	let t4;
    	let t5_value = /*move*/ ctx[12].col + "";
    	let t5;
    	let t6;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text("Player ");
    			t1 = text(t1_value);
    			t2 = text(" chose Row : ");
    			t3 = text(t3_value);
    			t4 = text(" , Col : ");
    			t5 = text(t5_value);
    			t6 = space();
    			add_location(li, file$2, 102, 2, 2336);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    			append_dev(li, t3);
    			append_dev(li, t4);
    			append_dev(li, t5);
    			append_dev(li, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*gameMoves*/ 2 && t1_value !== (t1_value = /*move*/ ctx[12].player + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*gameMoves*/ 2 && t3_value !== (t3_value = /*move*/ ctx[12].row + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*gameMoves*/ 2 && t5_value !== (t5_value = /*move*/ ctx[12].col + "")) set_data_dev(t5, t5_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(102:2) {#each gameMoves as move}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let br;
    	let t4;
    	let t5;
    	let div1;
    	let ul;
    	let current;

    	const gameboard = new GameBoard({
    			props: {
    				gameMatrix: /*gameMatrix*/ ctx[0],
    				onCellSelect: /*selectCell*/ ctx[5]
    			},
    			$$inline: true
    		});

    	let if_block = /*gameOver*/ ctx[4] && create_if_block(ctx);
    	let each_value = /*gameMoves*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text("Player ");
    			t1 = text(/*player*/ ctx[3]);
    			t2 = text("'s turn\n    ");
    			create_component(gameboard.$$.fragment);
    			t3 = space();
    			br = element("br");
    			t4 = space();
    			if (if_block) if_block.c();
    			t5 = space();
    			div1 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(br, file$2, 90, 4, 2062);
    			attr_dev(div0, "id", "playground");
    			attr_dev(div0, "class", "svelte-1x6nqy0");
    			add_location(div0, file$2, 87, 2, 1952);
    			add_location(ul, file$2, 100, 1, 2301);
    			attr_dev(div1, "id", "history");
    			add_location(div1, file$2, 99, 2, 2281);
    			attr_dev(div2, "id", "app");
    			attr_dev(div2, "class", "svelte-1x6nqy0");
    			add_location(div2, file$2, 86, 0, 1935);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    			mount_component(gameboard, div0, null);
    			append_dev(div0, t3);
    			append_dev(div0, br);
    			append_dev(div0, t4);
    			if (if_block) if_block.m(div0, null);
    			append_dev(div2, t5);
    			append_dev(div2, div1);
    			append_dev(div1, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*player*/ 8) set_data_dev(t1, /*player*/ ctx[3]);
    			const gameboard_changes = {};
    			if (dirty & /*gameMatrix*/ 1) gameboard_changes.gameMatrix = /*gameMatrix*/ ctx[0];
    			gameboard.$set(gameboard_changes);

    			if (/*gameOver*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*gameMoves*/ 2) {
    				each_value = /*gameMoves*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(gameboard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(gameboard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(gameboard);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks, detaching);
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
    	let gameMatrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    	let gameMoves = [];
    	let winner = null;
    	let player = 1;
    	let gameOver = false;
    	const nextPlayer = () => player == 1 ? 2 : 1;
    	const alreadySelected = (rowIndex, colIndex) => gameMatrix[rowIndex][colIndex] !== 0;

    	const gameWon = () => {
    		$$invalidate(2, winner = player);
    		$$invalidate(4, gameOver = true);
    	};

    	const verifyGame = (rowIndex, colIndex) => {
    		const rowConquered = gameMatrix[rowIndex].every(x => x === player);

    		if (rowConquered) {
    			gameWon();
    			return;
    		}

    		const colConquered = gameMatrix.every(x => x[colIndex] === player);

    		if (colConquered) {
    			gameWon();
    			return;
    		}

    		if (rowIndex === colIndex) {
    			const diagonal = gameMatrix.every((r, idx) => gameMatrix[idx][idx] === player);

    			if (diagonal) {
    				gameWon();
    				return;
    			}
    		}

    		const noMoves = gameMatrix.every(row => row.every(x => x !== 0));

    		if (noMoves) {
    			$$invalidate(4, gameOver = true);
    		}
    	};

    	const recordMove = (rowIndex, colIndex) => {
    		$$invalidate(1, gameMoves = [...gameMoves, { row: rowIndex, col: colIndex, player }]);
    	};

    	const selectCell = (rowIndex, colIndex) => {
    		if (gameOver) return;
    		if (alreadySelected(rowIndex, colIndex)) return;
    		$$invalidate(0, gameMatrix[rowIndex][colIndex] = player, gameMatrix);
    		recordMove(rowIndex, colIndex);
    		verifyGame(rowIndex, colIndex);
    		$$invalidate(3, player = nextPlayer());
    	};

    	const restartGame = () => {
    		$$invalidate(1, gameMoves = []);
    		$$invalidate(0, gameMatrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
    		$$invalidate(3, player = 1);
    		$$invalidate(2, winner = null);
    		$$invalidate(4, gameOver = false);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$capture_state = () => ({
    		GameBoard,
    		gameMatrix,
    		gameMoves,
    		winner,
    		player,
    		gameOver,
    		nextPlayer,
    		alreadySelected,
    		gameWon,
    		verifyGame,
    		recordMove,
    		selectCell,
    		restartGame
    	});

    	$$self.$inject_state = $$props => {
    		if ("gameMatrix" in $$props) $$invalidate(0, gameMatrix = $$props.gameMatrix);
    		if ("gameMoves" in $$props) $$invalidate(1, gameMoves = $$props.gameMoves);
    		if ("winner" in $$props) $$invalidate(2, winner = $$props.winner);
    		if ("player" in $$props) $$invalidate(3, player = $$props.player);
    		if ("gameOver" in $$props) $$invalidate(4, gameOver = $$props.gameOver);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [gameMatrix, gameMoves, winner, player, gameOver, selectCell, restartGame];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
