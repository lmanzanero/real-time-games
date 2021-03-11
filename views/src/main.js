import App from './App.svelte';

const app = new App({
	target: document.body, 
	hyratable: true,
	props: {
		name: 'Real Time Games'
	}
});

export default app;