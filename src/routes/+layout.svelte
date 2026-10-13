<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { base } from '$app/paths';
  let { children } = $props();
  
  const navItems = [
    { href: '/', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/spells', label: 'Spells', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { href: '/classes', label: 'Classes', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { href: '/equipment', label: 'Gear', icon: 'M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243-4.243z' },
    { href: '/character', label: 'Character', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ];
  
  function isActive(href: string, pathname: string) {
    const p = base + href;
    if (p === (base + '/')) return pathname === (base + '/') || pathname === base;
    return pathname.startsWith(p);
  }
</script>

<div class="min-h-dvh flex flex-col bg-dnd-darker">
  <main class="flex-1 pb-20 overflow-y-auto">
    {@render children()}
  </main>
  
  <nav class="fixed bottom-0 inset-x-0 bg-dnd-dark/95 backdrop-blur-sm border-t border-dnd-border z-50 safe-area-bottom">
    <div class="flex items-center justify-around max-w-lg mx-auto h-16">
      {#each navItems as item}
        <a
          href={base + item.href}
          class="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors
            {isActive(item.href, page.url.pathname) ? 'text-dnd-gold' : 'text-dnd-text-muted hover:text-dnd-text'}"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={item.icon}/>
          </svg>
          <span class="text-[10px] font-medium">{item.label}</span>
        </a>
      {/each}
    </div>
  </nav>
</div>