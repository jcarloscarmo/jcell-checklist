// Global variables
let inspectionStates = {};
let photos = {};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

/**
 * Initialize the application with default values
 */
function initializeApp() {
    // Set current date
    const today = new Date();
    const formattedDate = formatDate(today);
    document.getElementById('date').value = formattedDate;
    
    // Initialize inspection states
    initializeInspectionStates();
    
    // Initialize photo handlers
    initializePhotoHandlers();
}

/**
 * Format date to dd/mm/yyyy
 */
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Initialize inspection states object
 */
function initializeInspectionStates() {
    const questions = [
        'hasPhysicalButtons', 'buttonsWork', 'screenWorks', 'touchWorks',
        'screenCracked', 'screenScratched', 'backBroken', 'backScratched',
        'cameraLensDamaged', 'cameraExposed', 'cameraDamaged', 'audioOutputDamaged',
        'audioOutputDirty', 'hasSound', 'headphoneJackDamaged', 'deviceTurnsOn',
        'deviceCharges', 'moistureSigns'
    ];
    
    questions.forEach(question => {
        inspectionStates[question] = null;
    });
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Budget checkbox event listener
    const budgetCheckbox = document.getElementById('budgetCheckbox');
    const problemDescription = document.getElementById('problemDescription');
    
    budgetCheckbox.addEventListener('change', function() {
        if (this.checked) {
            problemDescription.classList.remove('hidden');
        } else {
            problemDescription.classList.add('hidden');
            document.getElementById('problemText').value = '';
        }
    });
    
    // Inspection button event listeners
    const inspectionButtons = document.querySelectorAll('.btn-state');
    inspectionButtons.forEach(button => {
        button.addEventListener('click', function() {
            handleInspectionButtonClick(this);
        });
    });
    
    // PDF generation button
    const generatePDFButton = document.getElementById('generatePDF');
    generatePDFButton.addEventListener('click', function() {
        generatePDF();
    });
    
    // Form validation
    const serviceOrderInput = document.getElementById('serviceOrder');
    const customerNameInput = document.getElementById('customerName');
    
    [serviceOrderInput, customerNameInput].forEach(input => {
        input.addEventListener('input', validateForm);
    });
}

/**
 * Handle inspection button clicks
 */
function handleInspectionButtonClick(button) {
    const buttonGroup = button.parentElement;
    const question = buttonGroup.getAttribute('data-question');
    const state = button.getAttribute('data-state');
    
    // Remove active class from all buttons in the group
    buttonGroup.querySelectorAll('.btn-state').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    button.classList.add('active');
    
    // Store the state
    inspectionStates[question] = state;
    
    // Add visual feedback
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = '';
    }, 150);
}

/**
 * Initialize photo handlers
 */
function initializePhotoHandlers() {
    for (let i = 1; i <= 3; i++) {
        const photoInput = document.getElementById(`photo${i}`);
        const preview = document.getElementById(`preview${i}`);
        
        photoInput.addEventListener('change', function(event) {
            handlePhotoUpload(event, i, preview);
        });
    }
}

/**
 * Handle photo uploads and previews
 */
function handlePhotoUpload(event, photoNumber, previewElement) {
    const file = event.target.files[0];
    
    if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas arquivos de imagem.');
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB.');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Store the image data
            photos[`photo${photoNumber}`] = {
                data: e.target.result,
                name: file.name
            };
            
            // Create preview
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = `Foto ${photoNumber}`;
            
            // Clear previous content and add image
            previewElement.innerHTML = '';
            previewElement.appendChild(img);
            previewElement.classList.add('has-image');
        };
        
        reader.onerror = function() {
            alert('Erro ao carregar a imagem. Tente novamente.');
        };
        
        reader.readAsDataURL(file);
    }
}

/**
 * Validate form fields
 */
function validateForm() {
    const serviceOrder = document.getElementById('serviceOrder').value.trim();
    const customerName = document.getElementById('customerName').value.trim();
    const generateButton = document.getElementById('generatePDF');
    
    if (serviceOrder && customerName) {
        generateButton.disabled = false;
    } else {
        generateButton.disabled = true;
    }
}

/**
 * Generate PDF with all form data
 */
async function generatePDF() {
    const generateButton = document.getElementById('generatePDF');
    const originalText = generateButton.textContent;
    
    try {
        // Disable button and show loading state
        generateButton.disabled = true;
        generateButton.textContent = 'Gerando PDF...';
        
        // Collect form data
        const formData = collectFormData();
        
        // Generate PDF content
        const pdfContent = createPDFContent(formData);
        
        // Create PDF
        await createPDF(pdfContent, formData.serviceOrder);
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
        // Reset button
        generateButton.disabled = false;
        generateButton.textContent = originalText;
        validateForm(); // Re-validate to set correct disabled state
    }
}

/**
 * Collect all form data
 */
function collectFormData() {
    // Basic information
    const date = document.getElementById('date').value;
    const serviceOrder = document.getElementById('serviceOrder').value;
    const customerName = document.getElementById('customerName').value;
    
    // Repair types
    const repairTypes = [];
    const repairCheckboxes = document.querySelectorAll('input[name="repairType"]:checked');
    repairCheckboxes.forEach(checkbox => {
        repairTypes.push(checkbox.value);
    });
    
    // Problem description (if budget is selected)
    const problemText = document.getElementById('problemText').value;
    
    return {
        date,
        serviceOrder,
        customerName,
        repairTypes,
        problemText,
        inspectionStates: { ...inspectionStates },
        photos: { ...photos }
    };
}

/**
 * Analyze defects and suggest possible problems
 */
function analyzeDefects(data) {
    const problems = [];
    const defectCategories = {
        screen: ['screenCracked', 'screenScratched', 'screenWorks', 'touchWorks'],
        physical: ['backBroken', 'backScratched', 'hasPhysicalButtons', 'buttonsWork'],
        camera: ['cameraLensDamaged', 'cameraExposed', 'cameraDamaged'],
        audio: ['audioOutputDamaged', 'audioOutputDirty', 'hasSound', 'headphoneJackDamaged'],
        power: ['deviceTurnsOn', 'deviceCharges'],
        moisture: ['moistureSigns']
    };

    // Screen analysis
    if (data.inspectionStates.screenCracked === 'yes' || data.inspectionStates.screenScratched === 'yes') {
        problems.push('• Problema na tela: Possível necessidade de troca do display');
    }
    if (data.inspectionStates.touchWorks === 'no') {
        problems.push('• Touch não funciona: Problema no digitalizador ou cabo flex');
    }
    if (data.inspectionStates.screenWorks === 'no') {
        problems.push('• Tela não acende: Possível problema no LCD/OLED ou placa mãe');
    }

    // Physical damage analysis
    if (data.inspectionStates.backBroken === 'yes') {
        problems.push('• Traseira quebrada: Necessidade de troca da tampa traseira');
    }
    if (data.inspectionStates.buttonsWork === 'no') {
        problems.push('• Botões não funcionam: Problema nos botões físicos ou cabo flex');
    }

    // Camera analysis
    if (data.inspectionStates.cameraLensDamaged === 'yes' || data.inspectionStates.cameraDamaged === 'yes') {
        problems.push('• Câmera danificada: Possível troca do módulo da câmera');
    }
    if (data.inspectionStates.cameraExposed === 'yes') {
        problems.push('• Câmera exposta: Risco de danos internos, verificar proteção');
    }

    // Audio analysis
    if (data.inspectionStates.hasSound === 'no') {
        problems.push('• Sem som: Problema no alto-falante ou circuito de áudio');
    }
    if (data.inspectionStates.audioOutputDamaged === 'yes') {
        problems.push('• Saída de áudio danificada: Necessária limpeza ou reparo');
    }

    // Power analysis
    if (data.inspectionStates.deviceTurnsOn === 'no') {
        problems.push('• Aparelho não liga: Problema na bateria, carregador ou placa mãe');
    }
    if (data.inspectionStates.deviceCharges === 'no') {
        problems.push('• Não carrega: Problema no conector de carga ou circuito de carregamento');
    }

    // Moisture analysis
    if (data.inspectionStates.moistureSigns === 'yes') {
        problems.push('• Sinais de umidade: Risco de oxidação, limpeza completa necessária');
    }

    return problems;
}

/**
 * Create PDF content HTML
 */
function createPDFContent(data) {
    const repairTypesText = data.repairTypes.length > 0 ? data.repairTypes.join(', ') : 'Nenhum selecionado';
    
    let inspectionHTML = '';
    const questionLabels = {
        'hasPhysicalButtons': 'Há botões físicos?',
        'buttonsWork': 'Botões funcionam?',
        'screenWorks': 'Tela acende e exibe imagem?',
        'touchWorks': 'Touch funciona?',
        'screenCracked': 'Tela trincada?',
        'screenScratched': 'Tela riscada?',
        'backBroken': 'Traseira quebrada?',
        'backScratched': 'Traseira riscada?',
        'cameraLensDamaged': 'Lente da câmera danificada?',
        'cameraExposed': 'Câmera exposta?',
        'cameraDamaged': 'Câmera danificada?',
        'audioOutputDamaged': 'Saídas de som danificadas?',
        'audioOutputDirty': 'Saídas de som sujas?',
        'hasSound': 'O aparelho tem som?',
        'headphoneJackDamaged': 'Entrada de fone de ouvido danificada?',
        'deviceTurnsOn': 'Aparelho liga (vibra)?',
        'deviceCharges': 'O celular carrega?',
        'moistureSigns': 'Há sinais de umidade?'
    };
    
    const stateEmojis = {
        'yes': '✅ Sim',
        'no': '❌ Não',
        'na': '⚠️ Não possível testar'
    };
    
    Object.keys(questionLabels).forEach(question => {
        const state = data.inspectionStates[question];
        const stateText = state ? stateEmojis[state] : '- Não respondido';
        inspectionHTML += `
            <div class="inspection-result">
                <span>${questionLabels[question]}</span>
                <span>${stateText}</span>
            </div>
        `;
    });
    
    let photosHTML = '';
    Object.keys(data.photos).forEach(photoKey => {
        if (data.photos[photoKey]) {
            photosHTML += `
                <div class="photo-item">
                    <img src="${data.photos[photoKey].data}" alt="${photoKey}" style="max-width: 200px; max-height: 200px;">
                </div>
            `;
        }
    });
    
    if (!photosHTML) {
        photosHTML = '<p>Nenhuma foto anexada</p>';
    }
    
    const problemSection = data.repairTypes.includes('orcamento') && data.problemText ? 
        `<div class="info-item">
            <strong>Descrição do Problema:</strong><br>
            ${data.problemText}
        </div>` : '';

    // Generate defect analysis
    const detectedProblems = analyzeDefects(data);
    const problemsHTML = detectedProblems.length > 0 ? 
        `<h2>Análise de Defeitos e Possíveis Problemas</h2>
        <div class="problems-section">
            ${detectedProblems.map(problem => `<div class="problem-item">${problem}</div>`).join('')}
        </div>` : 
        `<h2>Análise de Defeitos</h2>
        <div class="problems-section">
            <div class="problem-item">• Nenhum defeito significativo detectado na inspeção visual</div>
        </div>`;
    
    return `
        <div class="pdf-content">
            <h1>JCELL - Checklist Técnico</h1>
            
            <h2>Informações Básicas</h2>
            <div class="info-item"><strong>Data:</strong> ${data.date}</div>
            <div class="info-item"><strong>Número da OS:</strong> ${data.serviceOrder}</div>
            <div class="info-item"><strong>Cliente:</strong> ${data.customerName}</div>
            
            <h2>Serviços Solicitados</h2>
            <div class="info-item"><strong>Tipo de Reparo:</strong> ${repairTypesText}</div>
            ${problemSection}
            
            <h2>Inspeção Visual</h2>
            <div class="inspection-results">
                ${inspectionHTML}
            </div>
            
            <h2>Fotos</h2>
            <div class="photo-grid">
                ${photosHTML}
            </div>
            
            ${problemsHTML}
            
            <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
                Checklist gerado em ${new Date().toLocaleString('pt-BR')}
            </div>
        </div>
    `;
}

/**
 * Create and download PDF
 */
async function createPDF(htmlContent, serviceOrder) {
    const { jsPDF } = window.jspdf;
    
    // Create a temporary element for rendering
    const tempElement = document.createElement('div');
    tempElement.innerHTML = htmlContent;
    tempElement.style.position = 'absolute';
    tempElement.style.left = '-9999px';
    tempElement.style.top = '0';
    tempElement.style.width = '800px';
    tempElement.style.background = 'white';
    tempElement.style.padding = '20px';
    
    document.body.appendChild(tempElement);
    
    try {
        // Create PDF with higher quality
        const canvas = await html2canvas(tempElement, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: 800,
            height: tempElement.scrollHeight
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth - 20; // 10mm margin on each side
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 10; // 10mm top margin
        
        // Add first page
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20); // Subtract page height minus margins
        
        // Add additional pages if needed
        while (heightLeft > 0) {
            position = heightLeft - imgHeight + 10;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - 20);
        }
        
        // Download PDF
        const fileName = `checklist-JCELL-${serviceOrder}.pdf`;
        pdf.save(fileName);
        
        // Show success message
        alert('PDF gerado com sucesso!');
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        throw error;
    } finally {
        // Clean up
        document.body.removeChild(tempElement);
    }
}


