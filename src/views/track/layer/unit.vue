<template>
	<vue-draggable-resizable ref="unitRef" :class="{'layer-unit-durable-active':data.track.active}"
		:class-name="config.className" :class-name-active="config.classNameActive" :parent="config.parent"
		:prevent-deactivation="config.preventDeactivation" :axis="config.axis" :x="config.x" :y="config.y" :w="config.w"
		:h="config.h" :z="config.z" :min-width="config.minWidth" :max-width="config.maxWidth" :handles="config.handles"
		:on-drag="onDrag" :on-resize="onResize" :snap="true" :resizable="data.resizable" @activated="onActivated"
		@deactivated="onDeactivated" @resizeStop="onResizeStop">
		<slot></slot>
		<div class="debug float" :style="{'margin-left':(!data.display||data.muted?'70px':'10px')}">
			X: {{data.track.x}} W: {{data.track.w}} DurableActive: {{data.track.active}}
		</div>
		<div class="states" v-show="!data.display||data.muted">
			<font-awesome-icon icon="fa-solid fa-eye-slash" v-show="!data.display" />
			<font-awesome-icon icon="fa-solid fa-volume-xmark" v-if="data.muted" />
		</div>
	</vue-draggable-resizable>
</template>

<script setup>
	import {
		ref,
		reactive,
		onMounted,
		onBeforeUnmount,
		watch,
		nextTick
	} from 'vue'
	import {
		useTrackStore
	} from '../../../store/track.js'
	import {
		useLayersDataStore
	} from '../../../store/layers.js'

	const trackStore = useTrackStore()
	const layersDataStore = useLayersDataStore()
	const unitRef = ref()
	const emits = defineEmits(['onDrag'])
	const props = defineProps({
		data: Object
	})
	const config = reactive({
		className: 'layer-unit',
		classNameActive: 'layer-unit-active',
		classNameDurableActive: 'layer-unit-durable-active',
		parent: true, //移动范围限制到父标签中
		preventDeactivation: false, //防止失去激活状态
		axis: 'x', //固定移动轴向
		x: props.data.track.x || 0, //初始x坐标
		y: 0, //初始y坐标
		w: props.data.track.w || 0, //初始宽度
		h: props.data.track.h, //初始高度
		z: 1, //z-index索引
		minWidth: 30,
		maxWidth: props.data.trackMaxWidth || 0,
		handles: ['mr', 'ml'], // 拖动手柄只保留左右
	})

	watch(() => props.data.track.x, (value) => {
		config.x = value
	})
	watch(() => props.data.track.w, (value) => {
		config.w = value
	})
	watch(() => props.data.trackMaxWidth, (value) => {
		config.maxWidth = value
	})

	// 拖拽事件
	const onDrag = (x, y) => {
		props.data.track.x = parseInt(x)
		// 开启吸附
		if (trackStore.unitAdsorption) adsorption(x)
		emitsDrag()
		return false
	}
	// 修改大小事件
	const onResize = (handle, x, y, width, height) => {
		props.data.track.x = parseInt(x)
		props.data.track.w = parseInt(width);
	}
	const onResizeStop = () => {
		emitsDrag()
	}
	/* 触发活跃状态 */
	const onActivated = () => {
		layersDataStore.setUnitActive(props.data.id)
	}
	/* 触发失去活跃状态,使其失去活力慢一点,可在激活状态做一些事件如分割 */
	const onDeactivated = () => {
		// setTimeout(() => layersDataStore.activeUnit = null, 200)
	}
	// 吸附判定
	const adsorption = (x) => {
		const headLines = []
		const tailLines = []
		const layer = layersDataStore.getLayerByUnitId(props.data.id)
		layer.units.forEach(item => {
			if (item.id != props.data.id) {
				headLines.push(parseInt(item.track.x))
				tailLines.push(parseInt(item.track.x + item.track.w))
			}
		})
		// 将引导线加入判定
		headLines.push(trackStore.seekerLocation)
		tailLines.push(trackStore.seekerLocation)
		for (let i = 0; i < headLines.length; i++) {
			// 头-尾对齐
			if (x > (tailLines[i] - trackStore.unitAdsorptionDecisionRange * 2) &&
				x < (tailLines[i] + trackStore.unitAdsorptionDecisionRange)) {
				props.data.track.x = tailLines[i]
			}
			// 尾-头对齐
			if ((x + config.w) > (headLines[i] - trackStore.unitAdsorptionDecisionRange) &&
				(x + config.w) < (headLines[i] + trackStore.unitAdsorptionDecisionRange * 2)) {
				props.data.track.x = headLines[i] - config.w
			}
		}
	}

	const emitsDrag = () => {
		emits('onDrag', props.data)
	}

	function mousedown(event) {
		props.data.track.dragging = true
		emitsDrag()
	}

	function mouseup(event) {
		if (props.data.track.dragging) {
			props.data.track.dragging = false
			emitsDrag()
		}
	}

	/* 渲染，部分资源需要加载后渲染样式 */
	function viewRender() {
		if (props.data.resource.viewRender) {
			nextTick(() => {
				props.data.resource.viewRender()
			})
		}
	}

	onMounted(() => {
		props.data.track.instance = unitRef.value.$el
		// 元素点击更新拖拽状态
		unitRef.value.$el.addEventListener('mousedown', mousedown);
		document.addEventListener('mouseup', mouseup);
		viewRender()
	})

	onBeforeUnmount(() => {
		unitRef.value.$el.removeEventListener('mousedown', mousedown);
		document.removeEventListener('mouseup', mouseup)
	})
</script>

<style scoped>
	.layer-unit {
		touch-action: none;
		position: absolute;
		box-sizing: border-box;
		border: 2px dashed #fff0;
		border-radius: 5px;
		background-color: var(--layer-unit-bg);
		overflow: hidden;
		filter: brightness(0.85);
	}

	.layer-unit-active {
		border: 2px solid var(--layer-unit-boder-color);
		z-index: 2 !important;
		filter: brightness(1);
	}

	.layer-unit-active:deep(.handle-ml) {
		position: absolute;
		width: 14px;
		height: 100%;
		top: 0px;
		bottom: 0px;
		left: 0;
		margin: 0;
		border: none;
		background-color: var(--layer-unit-handle-bg);
		background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAcAgMAAAA/7yYmAAAACVBMVEUAAAD///////9zeKVjAAAAAnRSTlMAtc2YijsAAAASSURBVAjXYwgIYFiwgJooIAAAih8hwSRVivkAAAAASUVORK5CYII=);
		background-repeat: no-repeat;
		background-position: center center;
		background-size: 3px 14px;
	}

	.layer-unit-active:deep(.handle-mr) {
		position: absolute;
		width: 14px;
		height: 100%;
		top: 0px;
		bottom: 0px;
		right: 0;
		margin: 0;
		border: none;
		background-color: var(--layer-unit-handle-bg);
		background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAcAgMAAAA/7yYmAAAACVBMVEUAAAD///////9zeKVjAAAAAnRSTlMAtc2YijsAAAASSURBVAjXYwgIYFiwgJooIAAAih8hwSRVivkAAAAASUVORK5CYII=);
		background-repeat: no-repeat;
		background-position: center center;
		background-size: 3px 14px;
	}

	.layer-unit-durable-active {
		border: 2px solid var(--layer-unit-boder-color);
		filter: brightness(1);
	}

	.states {
		display: flex;
		font-size: 12px;
		justify-content: space-between;
		position: absolute;
		margin-left: 10px;
		background-color: #0006;
		border-radius: 4px;
		padding: 8px;
		color: #eee;
		gap: 10px;
	}

	.debug {
		background-color: #0008;
		border-radius: 4px;
		margin-left: 10px;
		color: #fff;
		bottom: 0;
		right: 0;
		z-index: 10;
	}
</style>