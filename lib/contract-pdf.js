function pdfEscape(value) {
  return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[\r\n]+/g, ' ');
}

function wrapText(text, width = 92) {
  const words = String(text == null ? '' : text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > width && line) {
      lines.push(line);
      line = word;
    } else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  return lines;
}

function contractLines({ contractNumber, contractData, signedName, signedAt }) {
  const data = contractData || {};
  const group = (name) => data[name] || {};
  const lines = ['Pet Fly International Animal Travel Inc', 'International Animal Transportation Contract', `Contract Number: ${contractNumber}`, ''];
  const add = (title, entries) => {
    lines.push(title);
    entries.forEach(([label, value]) => { if (value) lines.push(...wrapText(`${label}: ${value}`)); });
    lines.push('');
  };
  add('Agreement', [['Contract Effective Date', group('agreement').effective_date]]);
  add('Client Information', [['Name', [group('client').first_name, group('client').last_name].filter(Boolean).join(' ')], ['Address', group('client').address], ['City / State / ZIP', group('client').city_state_zip], ['Phone', group('client').phone], ['Email', group('client').email]]);
  add('Animal Information', [["Pet's Name", group('animal').name], ["Pet's Type", group('animal').type], ['Breed', group('animal').breed], ['Gender', group('animal').gender], ['Date of Birth', group('animal').dob], ['Weight (kg)', group('animal').weight_kg], ['Color', group('animal').color], ['Microchip', group('animal').microchip], ['Length (cm)', group('animal').length_cm], ['Height (cm)', group('animal').height_cm]]);
  add('Travel Details', [['Departure', [group('travel').departure_country, group('travel').departure_state, group('travel').departure_city].filter(Boolean).join(' / ')], ['Arrival', [group('travel').arrival_country, group('travel').arrival_state, group('travel').arrival_city].filter(Boolean).join(' / ')], ['Travel Date', group('travel').travel_date], ['Airline / Flight', group('travel').airline_flight], ['Transfer City', group('travel').transfer_city], ['Arrival Date', group('shipment').arrival_date]]);
  add('Service Quotation', [['Shipping Method', group('quotation').shipping_method], ['Cargo Charge', group('quotation').cargo_charge], ['Vaccination', group('quotation').vaccination], ['Documentation', group('quotation').documentation], ['Customs Service', group('quotation').customs_service], ['Quarantine', group('quotation').quarantine], ['Other Service', group('quotation').other_service], ['Total Cost', group('quotation').total_cost]]);
  add('Payment and Carrier Details', [['Payment Method', group('payment').payment_method], ['Deposit Amount', group('payment').deposit_amount], ['Remaining Balance', group('payment').balance_amount], ['Pet Fly Representative', group('carrier').representative_name], ['Office Phone', group('carrier').office_phone], ['Website', group('carrier').website]]);
  const terms = [
    ['Description of Service', 'Pet Fly will provide transportation service for the live animal described in this contract, beginning on the effective date and according to the service quotation and travel details above.'],
    ['Payments', 'Payments shall be made to Pet Fly or its appointed representative in the amounts and by the due dates stated above. A shipment requiring transfer service to another international location may require an additional transfer fee. Failure to pay when due is a material breach; Pet Fly may cancel this agreement and/or seek legal remedies.'],
    ['Performance of Service', 'Carrier shall promptly and efficiently receive, ship, and deliver the live animal safely within the agreed schedule. The consignee shall be present at delivery. Carrier will comply with applicable provincial, federal, state, and local laws, rules, regulations, and industry standards.'],
    ['Term', "This contract terminates automatically upon Pet Fly's completion of the services required by this contract."],
    ['Insurance', 'Carrier shall maintain commercial general liability, cargo liability, and any government-required insurance during this agreement, and shall provide a certificate of insurance when required. Such insurance shall not be canceled or materially altered until at least thirty days after written notice to Client.'],
    ['Indemnification', 'Pet Fly agrees to indemnify and hold Client harmless from claims, losses, expenses, fees including attorney fees, costs, and judgments resulting from the acts or omissions of Pet Fly or its employees, agents, or representatives.'],
    ['Exclusive Control', 'Carrier has sole and exclusive control over the manner in which it and its agents perform shipping services, including personnel selection, discharge, discipline, and control. Carrier is independent and not substantially economically dependent upon Client.'],
    ['Health and Safety', 'Carrier is responsible for ensuring each carrier employee, driver, or worker receives orientation to job duties and safety requirements before assignment. No worker will be placed on equipment or instructed to perform duties without the skill or training to do so safely.'],
    ['Permits', 'Carrier has obtained or shall obtain at its sole expense all permits, licenses, certificates, authorities, and approvals required by law for performance of this agreement, and will provide reasonable written notice of any revocation or suspension action.'],
    ['Warranty', 'Pet Fly will provide services in a timely and workmanlike manner, using knowledge and recommendations meeting generally acceptable standards in its community and region, with care equal to or superior to that used by similar service providers.'],
    ['Default and Remedies', 'Material default includes failure to make a required payment, insolvency or bankruptcy, levy or seizure of property, or failure to make available or deliver services in the agreed time and manner. The non-defaulting party may give written notice describing the default. The receiving party has three days from the notice effective date to cure it; failure to cure results in automatic termination unless waived.'],
    ['Force Majeure', 'Performance prevented, restricted, or interfered with by causes beyond reasonable control is suspended to the necessary extent if prompt written notice is given. Force majeure includes acts of God, fire, explosion, vandalism, storms, governmental or military acts, emergencies, insurrections, riots, wars, strikes, lock-outs, work stoppages, labor disputes, and supplier failures. The excused party will use reasonable efforts to remove the cause and resume performance.'],
    ['Entire Agreement and Amendment', 'This agreement contains the entire agreement of the parties and supersedes prior written or oral agreements on this subject. It may be modified or amended only in writing signed by the party obligated under the amendment.'],
    ['Arbitration', 'Controversies or disputes arising from this agreement shall be resolved by binding arbitration under the then-current commercial arbitration rules of the American Arbitration Association. The arbitrator or arbitrators may not modify this contract or award punitive damages. The decision is final and binding, and judgment may be entered in a court of competent jurisdiction. The parties will continue their respective obligations during arbitration.'],
    ['Severability', 'If any provision is held invalid or unenforceable, the remaining provisions remain valid and enforceable. A provision may be limited as necessary to become valid and enforceable.'],
    ['Governing Law, Notice, and Waiver', 'This agreement is construed under the laws of the State of California. Notices must be delivered in person or by certified mail, return receipt requested, to the addresses in this agreement or another address furnished in writing. Failure to enforce a provision is not a waiver of the right to later enforce strict compliance.']
  ];
  lines.push('Terms and Conditions');
  terms.forEach(([title, text]) => lines.push(title, ...wrapText(text), ''));
  lines.push(`Signed electronically by: ${signedName}`, `Signed at: ${new Date(signedAt).toLocaleString()}`, 'Electronic signature captured and retained by Pet Fly Inc.');
  return lines;
}

function generateContractPdf(contract) {
  const pages = [];
  const lines = contractLines(contract);
  for (let index = 0; index < lines.length; index += 48) pages.push(lines.slice(index, index + 48));
  const objects = [];
  const add = (value) => { objects.push(value); return objects.length; };
  const catalog = add('');
  const pagesObject = add('');
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const sectionTitles = new Set(['Agreement', 'Client Information', 'Animal Information', 'Travel Details', 'Service Quotation', 'Payment and Carrier Details', 'Terms and Conditions']);
  const pageIds = pages.map((pageLines, pageIndex) => {
    let y = 672;
    const commands = [
      'q', '0.09 0.17 0.24 rg', '0 700 612 92 re', 'f', 'Q',
      'BT', '1 1 1 rg', '/F1 20 Tf', '50 754 Td', '(Pet Fly International Animal Travel Inc) Tj',
      '/F1 9 Tf', '50 735 Td', `(International Animal Transportation Contract  |  ${pdfEscape(contract.contractNumber)}) Tj`, 'ET'
    ];
    pageLines.forEach(line => {
      if (sectionTitles.has(line)) {
        y -= 7;
        commands.push('q', '0.92 0.88 0.80 rg', `44 ${y - 5} 524 18 re`, 'f', 'Q', 'BT', '0.09 0.17 0.24 rg', '/F1 11 Tf', `52 ${y} Td`, `(${pdfEscape(line)}) Tj`, 'ET');
        y -= 24;
      } else if (line) {
        commands.push('BT', '0.13 0.14 0.15 rg', '/F1 9 Tf', `52 ${y} Td`, `(${pdfEscape(line)}) Tj`, 'ET');
        y -= 13;
      } else y -= 7;
    });
    commands.push('q', '0.75 0.71 0.65 RG', '44 43 m', '568 43 l', 'S', 'Q', 'BT', '0.35 0.31 0.27 rg', '/F1 8 Tf', `50 28 Td`, `(Pet Fly Inc  |  Page ${pageIndex + 1} of ${pages.length}) Tj`, 'ET');
    const stream = commands.join('\n');
    const content = add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    return add(`<< /Type /Page /Parent ${pagesObject} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`);
  });
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObject} 0 R >>`;
  objects[pagesObject - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  let output = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(output)); output += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { output += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(output, 'utf8');
}

module.exports = { generateContractPdf };
