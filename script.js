const CRM = {
    // Carrega dados do LocalStorage ou inicia vazio
    leads: JSON.parse(localStorage.getItem('zapia_crm_leads')) || [],

    init() {
        this.render();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const modal = document.getElementById('modal-lead');
        const inputBusca = document.getElementById('input-busca');
        const form = document.getElementById('form-lead');
        
        // 1. Busca em tempo real (Filtra enquanto digita)
        inputBusca.oninput = () => {
            this.render();
            this.renderTabela();
        };

        // 2. Controle do Modal
        document.getElementById('btn-novo-lead').onclick = () => modal.style.display = 'block';
        document.querySelector('.close-modal').onclick = () => modal.style.display = 'none';
        window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

        // 3. Cadastro de Novo Lead
        form.onsubmit = (e) => {
            e.preventDefault();
            const nome = document.getElementById('lead-nome').value;
            const empresa = document.getElementById('lead-empresa').value;
            const valor = Number(document.getElementById('lead-valor').value) || 0;

            this.criarLead(nome, empresa, valor);
            form.reset();
            modal.style.display = 'none';
        };

        // 4. Navegação entre Telas (SPA)
        document.querySelectorAll('.nav-links li').forEach(item => {
            item.onclick = () => {
                document.querySelectorAll('.nav-links li').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                document.querySelectorAll('.view-container').forEach(v => v.style.display = 'none');

                if (item.id === 'nav-dashboard') {
                    document.getElementById('view-dashboard').style.display = 'block';
                    this.render();
                } else if (item.id === 'nav-leads') {
                    document.getElementById('view-leads').style.display = 'block';
                    this.renderTabela();
                } else if (item.id === 'nav-relatorios') {
                    document.getElementById('view-relatorios').style.display = 'block';
                    this.renderRelatorios();
                }
            };
        });

        // 5. Lógica de Drag and Drop
        document.querySelectorAll('.kanban-cards').forEach(col => {
            col.ondragover = (e) => { e.preventDefault(); col.classList.add('drag-over'); };
            col.ondragleave = () => col.classList.remove('drag-over');
            col.ondrop = (e) => {
                e.preventDefault();
                col.classList.remove('drag-over');
                const id = e.dataTransfer.getData('text');
                const novoStatus = col.parentElement.id;
                this.mudarStatus(id, novoStatus);
            };
        });
    },

    criarLead(nome, empresa, valor) {
        const novo = { id: Date.now(), nome, empresa, valor, status: "novo" };
        this.leads.push(novo);
        this.save();
        this.render();
    },

    mudarStatus(id, status) {
        const lead = this.leads.find(l => l.id == id);
        if (lead) { 
            lead.status = status; 
            this.save(); 
            this.render(); 
        }
    },

    excluirLead(id) {
        if (confirm("Tem certeza que deseja excluir este lead?")) {
            this.leads = this.leads.filter(l => l.id !== id);
            this.save();
            this.render();
            this.renderTabela();
        }
    },

    formatarMoeda(v) {
        return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    },

    save() { 
        localStorage.setItem('zapia_crm_leads', JSON.stringify(this.leads)); 
    },

    // Renderiza o Dashboard (Kanban) com Filtro de Busca
    render() {
        const termo = document.getElementById('input-busca').value.toLowerCase();
        const statuses = ['novo', 'contato', 'proposta', 'fechado'];

        statuses.forEach(status => {
            const container = document.getElementById(`cards-${status}`);
            if (!container) return;

            const filtrados = this.leads.filter(l => 
                l.status === status && 
                (l.nome.toLowerCase().includes(termo) || l.empresa.toLowerCase().includes(termo))
            );

            // Atualiza o contador da coluna
            const countLabel = document.querySelector(`#${status} .count`);
            if (countLabel) countLabel.innerText = filtrados.length;

            container.innerHTML = filtrados.map(l => `
                <div class="lead-card" draggable="true" ondragstart="event.dataTransfer.setData('text', ${l.id})">
                    <button class="btn-delete" onclick="CRM.excluirLead(${l.id})">&times;</button>
                    <h4>${l.nome}</h4>
                    <p>${l.empresa}</p>
                    <span class="lead-value">${this.formatarMoeda(l.valor)}</span>
                </div>
            `).join('');
        });
    },

    // Renderiza a Lista Geral com Filtro de Busca
    renderTabela() {
        const termo = document.getElementById('input-busca').value.toLowerCase();
        const filtrados = this.leads.filter(l => 
            l.nome.toLowerCase().includes(termo) || l.empresa.toLowerCase().includes(termo)
        );

        const tbody = document.getElementById('corpo-tabela-leads');
        if (!tbody) return;

        tbody.innerHTML = filtrados.map(l => `
            <tr>
                <td>${l.nome}</td>
                <td>${l.empresa}</td>
                <td style="color:var(--success); font-weight:bold;">${this.formatarMoeda(l.valor)}</td>
                <td><span style="background:#e2e8f0; padding:4px 10px; border-radius:10px; font-size:0.8rem; text-transform:capitalize;">${l.status}</span></td>
                <td><button onclick="CRM.excluirLead(${l.id})" style="color:var(--danger); border:none; background:none; cursor:pointer; font-weight:bold;">Excluir</button></td>
            </tr>
        `).join('');
    },

    // Calcula e Renderiza as Métricas na Tela de Relatórios
    renderRelatorios() {
        const totalLeads = this.leads.length;
        const fechados = this.leads.filter(l => l.status === 'fechado');
        const negociacao = this.leads.filter(l => l.status !== 'fechado');
        
        const valorNegociacao = negociacao.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
        const conversao = totalLeads ? Math.round((fechados.length / totalLeads) * 100) : 0;
        const totalVendas = fechados.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
        const ticket = fechados.length ? Math.round(totalVendas / fechados.length) : 0;

        document.getElementById('metric-valor').innerText = this.formatarMoeda(valorNegociacao);
        document.getElementById('metric-conversao').innerText = `${conversao}%`;
        document.getElementById('metric-ticket').innerText = this.formatarMoeda(ticket);
    }
};

CRM.init();
