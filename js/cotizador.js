document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const STORAGE_KEY = "vizual_cotizador_v2";
    const WHATSAPP_NUMBER = "526691632351";

    const PRICES = { basico: 599, intermedio: 825, masVendido: 950 };
    const QUALITY_NAMES = { basico: "Básico", intermedio: "Intermedio", masVendido: "Más vendido" };
    const QUALITY_DESCRIPTIONS = {
        basico: "Opción económica y funcional.",
        intermedio: "Mejor textura y mayor durabilidad.",
        masVendido: "La mejor calidad y acabado."
    };

    const defaultState = {
        step: 1,
        context: "initial",
        currentWindow: { calidad: null, ancho: "", alto: "" },
        editingIndex: null,
        ventanas: [],
        cliente: { nombre: "", whatsapp: "" }
    };

    let state = loadState();
    const screen = document.getElementById("screen");
    const progressSegments = [...document.querySelectorAll(".quote-progress__segment")];

    function cloneDefault(){ return JSON.parse(JSON.stringify(defaultState)); }

    function loadState(){
        try{
            const saved=localStorage.getItem(STORAGE_KEY);
            if(!saved) return cloneDefault();
            const parsed=JSON.parse(saved);
            return {
                ...cloneDefault(), ...parsed,
                currentWindow:{...cloneDefault().currentWindow,...(parsed.currentWindow||{})},
                ventanas:Array.isArray(parsed.ventanas)?parsed.ventanas:[],
                cliente:{...cloneDefault().cliente,...(parsed.cliente||{})}
            };
        }catch{return cloneDefault();}
    }

    function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    function clearState(){
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem("vizual_cotizador_session_id");
        sessionStorage.removeItem("vizual_cotizador_inicio_registrado");
    }

    function getSessionId(){
        const key = "vizual_cotizador_session_id";
        let sessionId = localStorage.getItem(key);

        if(!sessionId){
            sessionId = crypto.randomUUID();
            localStorage.setItem(key, sessionId);
        }

        return sessionId;
    }

    async function trackEvent(evento, datos = {}){
        try{
            const payload = {
                session_id: getSessionId(),
                evento,
                ...datos
            };

            await fetch("/api/evento.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload),
                keepalive: true
            });
        }catch(error){
            // La analítica nunca debe romper el cotizador.
            console.warn("Error registrando evento:", error);
        }
    }

    function money(value){
        return new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(value);
    }

    function calculateWindow(ancho, alto, calidad){
        const anchoCalc=Math.max(100,Number(ancho));
        const altoCalc=Math.max(100,Number(alto));
        const area=(anchoCalc/100)*(altoCalc/100);
        const price=Math.ceil(area*PRICES[calidad]);
        return {ancho:Number(ancho),alto:Number(alto),anchoCalc,altoCalc,area,precioM2:PRICES[calidad],precio:price,calidad};
    }

    function total(){ return state.ventanas.reduce((sum,item)=>sum+item.precio,0); }

    function updateProgress(step=state.step){
        progressSegments.forEach((segment,index)=>segment.classList.toggle("is-active",index<Math.min(Math.max(step,1),5)));
    }

    function setStep(step){
        state.step=step; saveState(); render(); window.scrollTo({top:0,behavior:"smooth"});
    }

    function startNewWindow(){
        state.currentWindow={calidad:null,ancho:"",alto:""};
        state.editingIndex=null; state.context="new"; state.step=1;
        saveState(); render(); window.scrollTo({top:0,behavior:"smooth"});
    }

    function editWindow(index){
        const item=state.ventanas[index];
        state.currentWindow={calidad:item.calidad,ancho:item.ancho,alto:item.alto};
        state.editingIndex=index; state.context="edit"; state.step=1;
        saveState(); render(); window.scrollTo({top:0,behavior:"smooth"});
    }

    function escapeHtml(value){
        return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
    }

    function backButton(targetStep,label="Atrás"){
        return `<button class="back-btn" type="button" data-back="${targetStep}"><i class="bi bi-arrow-left"></i> ${label}</button>`;
    }

    const logoHome = document.querySelector(".quote-header__logo");
    logoHome?.addEventListener("click",(e)=>{
        e.preventDefault();
        state.editingIndex=null;
        state.currentWindow={calidad:null,ancho:"",alto:""};
        if(state.ventanas && state.ventanas.length){
            state.context="summary";
            state.step=3;
        }else{
            state.context="initial";
            state.step=1;
        }
        saveState();
        render();
        window.scrollTo({top:0,behavior:"smooth"});
    });

    function render(){
        updateProgress();
        if(state.step===1) renderQuality();
        if(state.step===2) renderMeasures();
        if(state.step===3) renderSummary();
        if(state.step===4) renderDecision();
        if(state.step===5) renderContact();
    }

    function renderQuality(){
        const selected=state.currentWindow.calidad;
        let eyebrow="Sheer Elegance";
        if(state.context==="new") eyebrow="Nueva ventana · Sheer Elegance";
        if(state.context==="edit") eyebrow=`Editar ventana ${state.editingIndex+1} · Sheer Elegance`;

        screen.innerHTML=`
            <div class="quote-screen">
                <div class="screen-top">
                    <p class="quote-eyebrow">${eyebrow}</p>
                    <h1 class="quote-title">Elige la calidad de tu Sheer Elegance</h1>
                    <p class="quote-intro">Cada calidad tiene diferentes características y beneficios.</p>
                </div>

                <div class="quality-list">
                    ${Object.entries(PRICES).map(([key,price])=>`
                        <button class="quality-card ${selected===key?"is-selected":""}" type="button" data-quality="${key}" aria-pressed="${selected===key}">
                            <span class="quality-card__icon" aria-hidden="true"><i class="bi bi-gem"></i></span>
                            ${key==="masVendido"?'<span class="quality-card__badge">RECOMENDADO</span>':""}
                            <p class="quality-card__name">${QUALITY_NAMES[key]}</p>
                            <p class="quality-card__price">${money(price)} / m²</p>
                            <p class="quality-card__description">${QUALITY_DESCRIPTIONS[key]}</p>
                        </button>
                    `).join("")}
                </div>

                <div class="form-actions">
                    <button class="btn btn--primary" type="button" id="continueQuality" ${selected?"":"disabled"}>Continuar <i class="bi bi-arrow-right"></i></button>
                </div>

                ${state.ventanas.length&&state.context==="new"?'<button class="btn btn--ghost" type="button" id="viewProject">Ver mi proyecto</button>':""}
            </div>`;

        const cards=[...document.querySelectorAll("[data-quality]")];
        cards.forEach(card=>card.addEventListener("click",()=>{
            state.currentWindow.calidad=card.dataset.quality;
            saveState();

            trackEvent("calidad_seleccionada", {
                calidad: state.currentWindow.calidad
            });
            cards.forEach(item=>{
                const active=item.dataset.quality===state.currentWindow.calidad;
                item.classList.toggle("is-selected",active);
                item.setAttribute("aria-pressed",active?"true":"false");
            });
            const button=document.getElementById("continueQuality");
            if(button) button.disabled=false;
        }));

        document.getElementById("continueQuality")?.addEventListener("click",()=>{
            // Si venimos de "Atrás" desde el resumen, continuamos editando
            // la ventana existente en lugar de crear una nueva.
            setStep(2);
        });
        document.getElementById("viewProject")?.addEventListener("click",()=>setStep(3));
    }

    function renderMeasures(){
        const editing=state.context==="edit";
        screen.innerHTML=`
            <div class="quote-screen">
                ${backButton(1)}
                <div class="screen-top">
                    <p class="quote-eyebrow">${QUALITY_NAMES[state.currentWindow.calidad]} · ${money(PRICES[state.currentWindow.calidad])} / m²</p>
                    <h1 class="quote-title">Ingresa las medidas de tu ventana</h1>
                    <p class="quote-intro">Ingresa la medida final que deseas que tenga la persiana.</p>
                </div>

                <div class="card measure-card">
                    <div class="measure-illustration" aria-label="Ventana para indicar dónde medir el ancho y el alto">
                        <div class="measure-line measure-line--width">ANCHO</div>
                        <img class="measure-window-image" src="assets/images/ventana-medidas.webp" alt="Ventana sin persiana para indicar el ancho y alto a medir" loading="eager" decoding="async">
                        <div class="measure-line measure-line--height">ALTO</div>
                    </div>

                    <div class="measure-grid">
                        <div class="field">
                            <label class="field__label" for="ancho">Ancho (cm)</label>
                            <input class="field__input" id="ancho" type="number" inputmode="numeric" min="1" max="500" step="1" value="${state.currentWindow.ancho}" placeholder="150" aria-describedby="anchoError">
                            <span class="field__error" id="anchoError"></span>
                        </div>
                        <div class="field">
                            <label class="field__label" for="alto">Alto (cm)</label>
                            <input class="field__input" id="alto" type="number" inputmode="numeric" min="1" max="500" step="1" value="${state.currentWindow.alto}" placeholder="200" aria-describedby="altoError">
                            <span class="field__error" id="altoError"></span>
                        </div>
                    </div>

                    <div class="recommendation">
                        <strong><i class="bi bi-lightbulb-fill"></i> RECOMENDACIÓN</strong><br>
                        Agrega 8–10 cm por cada lado al ancho para que la persiana cubra completamente la ventana y no quede al ras.
                    </div>
                </div>

                <div class="form-actions">
                    <button class="btn btn--primary" type="button" id="quoteWindow">${editing?"Guardar cambios":"Cotizar"} <i class="bi bi-arrow-right"></i></button>
                </div>
                <p class="muted notice-line"><i class="bi bi-info-circle-fill"></i><span>Máximo permitido: 500 cm de ancho y 500 cm de alto.</span></p>
            </div>`;

        document.querySelector('[data-back="1"]')?.addEventListener("click",()=>setStep(1));

        const sanitize=input=>{input.value=input.value.replace(/\D/g,"").slice(0,3)};
        document.getElementById("ancho").addEventListener("input",e=>sanitize(e.target));
        document.getElementById("alto").addEventListener("input",e=>sanitize(e.target));

        document.getElementById("quoteWindow").addEventListener("click",()=>{
            const ancho=Number(document.getElementById("ancho").value);
            const alto=Number(document.getElementById("alto").value);
            document.getElementById("anchoError").textContent="";
            document.getElementById("altoError").textContent="";
            let valid=true;

            if(!Number.isInteger(ancho)||ancho<1||ancho>500){document.getElementById("anchoError").textContent="El ancho debe estar entre 1 y 500 cm.";valid=false}
            if(!Number.isInteger(alto)||alto<1||alto>500){document.getElementById("altoError").textContent="El alto debe estar entre 1 y 500 cm.";valid=false}
            if(!valid)return;

            const item=calculateWindow(ancho,alto,state.currentWindow.calidad);
            if(state.context==="edit"&&state.editingIndex!==null) state.ventanas[state.editingIndex]=item;
            else state.ventanas.push(item);

            const currentTotal = total();

            trackEvent("medidas_calculadas", {
                calidad: item.calidad,
                ancho: item.ancho,
                alto: item.alto,
                area: item.area,
                precio: item.precio,
                numero_ventanas: state.ventanas.length,
                total: currentTotal
            });

            state.currentWindow={calidad:null,ancho:"",alto:""};
            state.editingIndex=null; state.context="initial";
            saveState();

            trackEvent("cotizacion_generada", {
                numero_ventanas: state.ventanas.length,
                total: currentTotal
            });

            setStep(3);
        });
    }

    function renderSummary(){
        screen.innerHTML=`
            <div class="quote-screen">
                <div class="screen-top">
                    <p class="quote-eyebrow">Resumen</p>
                    <div class="summary-heading">
                        <h1 class="quote-title">Tus persianas</h1>
                        
                    </div>
                    <p class="quote-intro">Revisa tus ventanas antes de continuar.</p>
                </div>

                <div class="summary-list">
                    ${state.ventanas.map((item,index)=>`
                        <article class="card window-card">
                            <div class="window-card__top">
                                <div>
                                    <div class="window-card__name-row">
                                        <span class="window-card__number">${index+1}.</span>
                                        <p class="window-card__name">Sheer Elegance</p>
                                    </div>
                                    <p class="window-card__meta">${item.ancho} × ${item.alto} cm · ${item.area.toFixed(2)} m²</p>
                                    <p class="window-card__price">${money(item.precio)}</p>
                                </div>
                                <span class="window-card__quality ${item.calidad==="masVendido"?"is-recommended":""}">${item.calidad==="masVendido"?"RECOMENDADO":QUALITY_NAMES[item.calidad].toUpperCase()}</span>
                            </div>

                            <div class="window-card__actions">
                                <button class="mini-btn" type="button" data-edit="${index}"><i class="bi bi-pencil"></i> Editar</button>
                                <button class="mini-btn mini-btn--danger" type="button" data-delete="${index}"><i class="bi bi-trash"></i> Eliminar</button>
                            </div>
                        </article>
                    `).join("")}
                </div>

                <button class="btn btn--secondary add-window-btn" type="button" id="addWindow"><i class="bi bi-plus-lg"></i> Agregar otra ventana</button>

                <div class="summary-total">
                    <div class="summary-total__label">TOTAL ESTIMADO</div>
                    <div class="summary-total__value">${money(total())}</div>
                </div>

                <div class="form-actions">
                    <button class="btn btn--primary" type="button" id="continueSummary">Continuar <i class="bi bi-arrow-right"></i></button>
                </div>
                <p class="muted notice-line"><i class="bi bi-info-circle-fill"></i><span>El total es un estimado y se confirma durante la visita.</span></p>
            </div>`;

        document.getElementById("addWindow").addEventListener("click",()=>{
            trackEvent("ventana_agregada", {
                numero_ventanas: state.ventanas.length,
                total: total()
            });

            startNewWindow();
        });
        document.getElementById("continueSummary").addEventListener("click",()=>setStep(4));

        document.querySelectorAll("[data-edit]").forEach(button=>button.addEventListener("click",()=>editWindow(Number(button.dataset.edit))));
        document.querySelectorAll("[data-delete]").forEach(button=>button.addEventListener("click",()=>{
            const index=Number(button.dataset.delete);
            if(!confirm(`¿Eliminar la ventana ${index+1}?`))return;
            state.ventanas.splice(index,1); saveState();
            if(!state.ventanas.length){state.context="initial";state.currentWindow={calidad:null,ancho:"",alto:""};setStep(1);return}
            renderSummary();
        }));
    }

    function renderDecision(){
        screen.innerHTML=`
            <div class="quote-screen decision-screen">
                ${backButton(3)}

                <div class="screen-top">
                    <h1 class="quote-title">¿Te interesan estas persianas?</h1>
                    <p class="quote-intro">
                        Tu cotización es un estimado. Visitamos tu domicilio para confirmar medidas, telas y precio final.
                    </p>
                </div>

                <div class="decision-list">
                    <article class="decision-card">
                        <div class="decision-card__icon" aria-hidden="true">
                            <i class="bi bi-person-check"></i>
                        </div>
                        <div>
                            <p class="decision-card__title">Confirmamos medidas en tu domicilio</p>
                            <p class="decision-card__text">para darte la cotización final exacta.</p>
                        </div>
                    </article>

                    <article class="decision-card">
                        <div class="decision-card__icon" aria-hidden="true">
                            <i class="bi bi-tools"></i>
                        </div>
                        <div>
                            <p class="decision-card__title">Instalación incluida en el precio final.</p>
                            <p class="decision-card__text">Servicio profesional y garantizado.</p>
                        </div>
                    </article>

                    <article class="decision-card">
                        <div class="decision-card__icon" aria-hidden="true">
                            <i class="bi bi-calendar3"></i>
                        </div>
                        <div>
                            <p class="decision-card__title">Instalación en 3 a 6 días hábiles</p>
                            <p class="decision-card__text">después de tu anticipo.</p>
                        </div>
                    </article>

                    <article class="decision-card">
                        <div class="decision-card__icon" aria-hidden="true">
                            <i class="bi bi-credit-card"></i>
                        </div>
                        <div>
                            <p class="decision-card__title">Se requiere un anticipo</p>
                            <p class="decision-card__text">para comenzar tu pedido.</p>
                        </div>
                    </article>
                </div>

                <div class="form-actions">
                    <button class="btn btn--primary" type="button" id="interested">
                        Me interesan estas persianas <i class="bi bi-check-circle-fill"></i>
                    </button>
                </div>

                <p class="muted notice-line decision-secure">
                    <i class="bi bi-lock-fill"></i>
                    <strong>Tus datos están seguros</strong>
                </p>
            </div>`;

        document.querySelector('[data-back="3"]')?.addEventListener("click",()=>setStep(3));
        document.getElementById("interested").addEventListener("click",()=>{
            trackEvent("interesado_click", {
                numero_ventanas: state.ventanas.length,
                total: total()
            });

            setStep(5);
        });
    }

    function renderContact(){
        screen.innerHTML=`
            <div class="quote-screen">
                ${backButton(4)}
                <div class="screen-top">
                    <p class="quote-eyebrow">Último paso</p>
                    <h1 class="quote-title">Agendemos tu visita.</h1>
                    <p class="quote-intro">Déjanos tus datos y abriremos WhatsApp con toda la información de tu cotización.</p>
                </div>

                <div class="card" style="padding:1rem;">
                    <div class="form-stack">
                        <div class="field"><label class="field__label" for="nombre">Nombre</label><input class="field__input" id="nombre" type="text" autocomplete="name" maxlength="80" value="${escapeHtml(state.cliente.nombre)}" placeholder="Tu nombre"><span class="field__error" id="nombreError"></span></div>
                        <div class="field"><label class="field__label" for="whatsapp">WhatsApp</label><input class="field__input" id="whatsapp" type="tel" inputmode="numeric" autocomplete="tel" maxlength="10" pattern="[0-9]*" value="${escapeHtml(state.cliente.whatsapp)}" placeholder="10 dígitos"><span class="field__error" id="whatsappError"></span></div>
                    </div>
                </div>

                <div class="form-actions"><button class="btn btn--whatsapp" type="button" id="openWhatsapp">Agendar mi visita por WhatsApp <i class="bi bi-whatsapp"></i></button></div>
                <p class="muted notice-line"><i class="bi bi-lock-fill"></i><strong>Tus datos están seguros</strong></p>
            </div>`;

        document.querySelector('[data-back="4"]')?.addEventListener("click",()=>setStep(4));
        const whatsappInput=document.getElementById("whatsapp");
        whatsappInput.addEventListener("input",()=>{whatsappInput.value=whatsappInput.value.replace(/\D/g,"").slice(0,10)});

        document.getElementById("openWhatsapp").addEventListener("click",()=>{
            const nombre=document.getElementById("nombre").value.trim();
            const whatsapp=whatsappInput.value.trim();
            document.getElementById("nombreError").textContent="";
            document.getElementById("whatsappError").textContent="";
            let valid=true;
            if(!nombre){document.getElementById("nombreError").textContent="Escribe tu nombre.";valid=false}
            if(!/^\d{10}$/.test(whatsapp)){document.getElementById("whatsappError").textContent="Ingresa un WhatsApp de 10 dígitos.";valid=false}
            if(!valid)return;

            state.cliente.nombre=nombre; state.cliente.whatsapp=whatsapp; saveState();

            trackEvent("datos_enviados", {
                numero_ventanas: state.ventanas.length,
                total: total()
            });

            const message=buildWhatsappMessage();
            const url=`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

            trackEvent("whatsapp_click", {
                numero_ventanas: state.ventanas.length,
                total: total()
            });

            window.open(url,"_blank","noopener,noreferrer");
            clearState(); renderFinal(message);
        });
    }

    function buildWhatsappMessage(){
        const lines=["Hola, me interesa cotizar mis persianas Sheer Elegance.","","DETALLE DE MI COTIZACIÓN"];
        state.ventanas.forEach((item,index)=>lines.push("",`${index+1}. Sheer Elegance — ${QUALITY_NAMES[item.calidad]}`,`   Medidas: ${item.ancho} × ${item.alto} cm`,`   Área: ${item.area.toFixed(2)} m²`,`   Precio estimado: ${money(item.precio)}`));
        lines.push("",`TOTAL ESTIMADO: ${money(total())}`,"",`Nombre: ${state.cliente.nombre}`,`WhatsApp: ${state.cliente.whatsapp}`,"","Me gustaría agendar una visita sin costo.");
        return lines.join("\n");
    }

    function renderFinal(message){
        progressSegments.forEach(segment=>segment.classList.add("is-active"));
        screen.innerHTML=`
            <div class="success quote-screen">
                <div class="success__icon"><i class="bi bi-check-lg"></i></div>
                <p class="quote-eyebrow">Cotización lista</p>
                <h1 class="quote-title">¡Perfecto! Ya casi terminamos.</h1>
                <p class="quote-intro">Abrimos WhatsApp con los datos de tu cotización para que puedas enviarlos a Persianas Vizual.</p>
                <div class="message-preview">${escapeHtml(message)}</div>
                <div class="form-actions">
                    <a class="btn btn--whatsapp" href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}" target="_blank" rel="noopener">Abrir WhatsApp <i class="bi bi-whatsapp"></i></a>
                    <button class="btn btn--secondary" type="button" id="restart">Nueva cotización</button>
                </div>
            </div>`;

        document.getElementById("restart").addEventListener("click",()=>{
            clearState();
            state=cloneDefault();
            saveState();
            updateProgress(1);
            render();
        });
    }
    // Recuperación segura: una cotización existente vuelve al resumen después de recargar.
    if(state.ventanas && state.ventanas.length){
        state.editingIndex=null;
        state.currentWindow={calidad:null,ancho:"",alto:""};
        state.context="summary";
        state.step=3;
        saveState();
    }


    if(!sessionStorage.getItem("vizual_cotizador_inicio_registrado")){
        trackEvent("cotizador_inicio");
        sessionStorage.setItem("vizual_cotizador_inicio_registrado", "1");
    }

    render();
});
