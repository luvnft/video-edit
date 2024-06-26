import {
	defineStore
} from 'pinia'

export const useResourceDragStore = defineStore('resource-drag', {
	state: () => ({
		data: null
	})
})

export const useResourceLocalStore = defineStore('resource-local', {
	state: () => ({
		videos: [],
		images: [],
		audios: []
	}),
	persist: true
})

export const useResourceLinkStore = defineStore('resource-link', {
	state: () => ({
		videos: [],
		images: [],
		audios: []
	}),
	persist: true
})