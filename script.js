const CRM = {
    leads: JSON.parse(localStorage.getItem('zapia_crm_leads')) || [],
    leadAtualId: null,

    init() {
        this.render();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const modalNovo = document.getElementById('modal-lead');
        const modalDetalhes = document.getElementById('modal-detalhes');
        const inputBusca = document.getElementById('input-busca');

        if (inputBusca) {
            inputBusca.oninput = () => { this.render(); this.renderTabela(); };
        }

        document.querySelectorAll('.nav-links li').forEach(item => {
            item.onclick = () => {
                document.querySelectorAll('.nav-links li').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                document.querySelectorAll('.view-container').forEach(v => v.style.display = 'none');
                
                if (item.id === 'nav-dashboard') { 
                    document.getElementById('view-dashboard').style.display = 'block'; 
                    this.render(); 
                }
                else if (item.id === 'nav-leads') { 
                    document.getElementById('view-leads').style.display = 'block'; 
                    this.renderTabela(); 
                }
                else if (item.id === 'nav-relatorios') { 
                    document.getElementById('view-relatorios').style.display = 'block'; 
                    this.renderRelatorios(); 
                }
            };
        });

        const btnNovo = document.getElementById('btn-novo-lead');
        if (btnNovo) btnNovo.onclick = () => modalNovo.style.display = 'block';
        
        const btnCloseNovo = document.getElementById('close-novo');
        if (btnCloseNovo) btnCloseNovo.onclick = () => modalNovo.style.display = 'none';
        
        const btnCloseDet = document.getElementById('close-detalhes');
        if (btnCloseDet) btnCloseDet.onclick = () => modalDetalhes.style.display = 'none';
        
        const btnAddNota = document.getElementById('btn-add-nota');
        if (btnAddNota) btnAddNota.onclick = () => this.adicionarNota();

        const formLead = document.getElementById('form-lead');
        if (formLead) {
            formLead.onsubmit = (e) => {
                e.preventDefault();
                this.criarLead(
                    document.getElementById('lead-nome').value,
                    document.getElementById('lead-empresa').value,
                    Number(document.getElementById('lead-valor').value) || 0
                );
                e.target.reset();
                modalNovo.style.display = 'none';
            };
        }

        window.onclick = (e) => {
            if (e.target == modalNovo) modalNovo.style.display = 'none';
            if (e.target == modalDetalhes) modalDetalhes.style.display = 'none';
        };

        document.querySelectorAll('.kanban-cards').forEach(col => {
            col.ondragover = (e) => { e.preventDefault(); col.classList.add('drag-over'); };
            col.ondragleave = () => col.classList.remove('drag-over');
            col.ondrop = (e) => {
                e.preventDefault();
                col.classList.remove('drag-over');
                this.mudarStatus(e.dataTransfer.getData('text'), col.parentElement.id);
            };
        });
    },

    criarLead(nome, empresa, valor) {
        this.leads.push({ 
            id: Date.now(), 
            nome: nome, 
            empresa: empresa, 
            valor: valor, 
            status: "novo", 
            prioridade: "media", 
            notas: [] 
        });
        this.save();
        this.render();
    },

    abrirDetalhes(id) {
        const lead = this.leads.find(l => l.id == id);
        if (!lead) return;
        this.leadAtualId = id;
        document.getElementById('detalhe-nome-lead').innerText = lead.nome;
        document.getElementById('detalhe-info').innerHTML = `
            <p><strong>Empresa:</strong> ${lead.empresa}</p>
            <p><strong>Valor:</strong> ${this.formatarMoeda(lead.valor)}</p>
            <p><strong>Status:</strong> ${lead.status.toUpperCase()}</p>
        `;
        this.renderNotas(lead.notas);
        document.getElementById('modal-detalhes').style.display = 'block';
    },

    adicionarNota() {
        const campoNota = document.getElementById('nova-nota');
        const texto = campoNota.value.trim();
        if (!texto || !this.leadAtualId) return;
        const lead = this.leads.find(l => l.id == this.leadAtualId);
        if (lead) {
            if (!lead.notas) lead.notas = [];
            lead.notas.unshift({ texto: texto, data: new Date().toLocaleString('pt-BR') });
            this.save();
            this.renderNotas(lead.notas);
            campoNota.value = '';
        }
    },

    renderNotas(notas) {
        const container = document.getElementById('lista-notas');
        if (!container) return;
        container.innerHTML = (!notas || notas.length === 0) ? 
            '<p style="text-align:center;color:#94a3b8;">Sem notas.</p>' :
            notas.map(n => '<div class="nota-item">' + n.texto + '<span class="nota-data">' + n.data + '</span></div>').join('');
    },

    mudarStatus(id, status) {
        const lead = this.leads.find(l => l.id == id);
        if (lead) { lead.status = status; this.save(); this.render(); }
    },

    excluirLead(id, e) {
        if (e) e.stopPropagation();
        if (confirm("Excluir este lead?")) {
            this.leads = this.leads.filter(l => l.id !== id);
            this.save();
            this.render();
            if (document.getElementById('view-leads').style.display !== 'none') {
                this.renderTabela();
            }
        }
    },

    formatarMoeda(v) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); },
    save() { localStorage.setItem('zapia_crm_leads', JSON.stringify(this.leads)); },

    render() {
        const inputBusca = document.getElementById('input-busca');
        const termo = inputBusca ? inputBusca.value.toLowerCase() : "";
        
        ['novo', 'contato', 'proposta', 'fechado'].forEach(status => {
            const container = document.getElementById('cards-' + status);
            if (!container) return;

            const filtrados = this.leads.filter(l => 
                l.status === status && 
                (l.nome.toLowerCase().includes(termo) || l.empresa.toLowerCase().includes(termo))
            );

            const countEl = document.querySelector('#' + status + ' .count');
            if (countEl) countEl.innerText = filtrados.length;

            let htmlCards = "";
            filtrados.forEach(l => {
                const p = l.prioridade || "media";
                htmlCards += '<div class="lead-card" draggable="true" ondragstart="event.dataTransfer.setData(\'text\', ' + l.id + ')" onclick="CRM.abrirDetalhes(' + l.id + ')">';
                htmlCards += '<button class="btn-delete" onclick="CRM.excluirLead(' + l.id + ', event)">&times;</button>';
                htmlCards += '<span class="tag tag-' + p + '">' + p + '</span>';
                htmlCards += '<h4>' + l.nome + '</h4>';
                htmlCards += '<p>' + l.empresa + '</p>';
                htmlCards += '<span class="lead-value">' + this.formatarMoeda(l.valor) + '</span>';
                htmlCards += '</div>';
            });
            container.innerHTML = htmlCards;
        });
    },

    renderTabela() {
        const inputBusca = document.getElementById('input-busca');
        const termo = inputBusca ? inputBusca.value.toLowerCase() : "";
        const filtrados = this.leads.filter(l => l.nome.toLowerCase().includes(termo) || l.empresa.toLowerCase().includes(termo));
        const corpoTabela = document.getElementById('corpo-tabela-leads');
        if (corpoTabela) {
            corpoTabela.innerHTML = filtrados.map(l => {
                return '<tr>' +
                    '<td>' + l.nome + '</td>' +
                    '<td>' + l.empresa + '</td>' +
                    '<td style="color:var(--success);font-weight:bold;">' + this.formatarMoeda(l.valor) + '</td>' +
                    '<td>' + l.status + '</td>' +
                    '<td><button onclick="CRM.excluirLead(' + l.id + ', event)" style="color:var(--danger);border:none;background:none;cursor:pointer;">Excluir</button></td>' +
                '</tr>';
            }).join('');
        }
    },

    renderRelatorios() {
        const fechados = this.leads.filter(l => l.status === 'fechado');
        const negociacao = this.leads.filter(l => l.status !== 'fechado');
        const valNeg = negociacao.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
        const conv = this.leads.length ? Math.round((fechados.length / this.leads.length) * 100) : 0;
        const ticket = fechados.length ? Math.round(fechados.reduce((a, b) => a + (Number(b.valor) || 0), 0) / fechados.length) : 0;
        
        const elValor = document.getElementById('metric-valor');
        const elConv = document.getElementById('metric-conversao');
        const elTicket = document.getElementById('metric-ticket');
        if (elValor) elValor.innerText = this.formatarMoeda(valNeg);
        if (elConv) elConv.innerText = conv + '%';
        if (elTicket) elTicket.innerText = this.formatarMoeda(ticket);
    }
};

CRM.init();
