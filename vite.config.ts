import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import skillsPlugin from './server/skills.mjs';
export default defineConfig({
 css:{postcss:{plugins:[tailwindcss()]}},
 server:{host:'127.0.0.1',watch:{useFsEvents:false,usePolling:true}},
 plugins:[skillsPlugin(),vinext()],
});
