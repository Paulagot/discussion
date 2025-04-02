// GenerateReport.jsx
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateReport = ({ sessionCode, participants, questions, activeQuestion, finishedQuestions, replies, hostName, isAdmin }) => {
  const doc = new jsPDF({ orientation: 'landscape' });

  // console.log("jsPDF imported:", jsPDF);
  // console.log("autoTable imported:", autoTable);

  const date = new Date().toLocaleDateString();
  const moderators = participants.filter(p => p.isModerator && !p.isAdmin).map(p => p.name);

  // Header function for each page
  const addHeader = () => {
    doc.setFontSize(16);
    doc.text("Q&A Session Report", 10, 10);
    doc.setFontSize(12);
    doc.text(`Session Code: ${sessionCode}`, 10, 20);
  };

  // Initial header and starting position
  addHeader();
  let yPos = 30;

  // Host (always shown)
  doc.text(`Host: ${hostName}`, 10, yPos);
  yPos += 10;

  // Admin-only: Moderators and Participant Count
  if (isAdmin) {
    if (moderators.length > 0) {
      doc.text(`Moderators: ${moderators.join(', ')}`, 10, yPos);
      yPos += 10;
    }
    doc.text(`Participants: ${participants.length}`, 10, yPos);
    yPos += 10;

    // Summary (admin-only)
    doc.text("Summary", 10, yPos);
    yPos += 5;
    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: [
        ['Total Questions Asked', questions.length + (activeQuestion ? 1 : 0) + finishedQuestions.length],
        ['Total Votes Cast', [...questions, activeQuestion, ...finishedQuestions].filter(Boolean).reduce((sum, q) => sum + q.votes, 0)],
        ['Total Comments Left', Object.values(replies).flat().length],
        ['Total Comments Starred', Object.values(replies).flat().filter(r => r.is_pinned).length],
      ],
      columnStyles: {
        0: { cellWidth: 90, overflow: 'linebreak' },
        1: { cellWidth: 50, overflow: 'linebreak' },
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        yPos = data.cursor.y + 10;
        addHeader();
      },
    });
  }

  // Finished Questions (shown to both)
  doc.text("Finished Questions", 10, yPos);
  yPos += 5;
  const finishedTableData = finishedQuestions.flatMap(q => {
    const repliesData = (replies[q.id] || []).map(r => ['', '', '', `${r.text} (${r.author}${r.is_pinned ? ', Starred' : ''})`]);
    return [
      [q.text, q.author, q.votes, repliesData.length > 0 ? repliesData[0][3] : ''],
      ...repliesData.slice(1),
    ];
  });
  autoTable(doc, {
    startY: yPos,
    head: [['Question', 'Author', 'Votes', 'Replies']],
    body: finishedTableData.length ? finishedTableData : [['No finished questions yet', '', '', '']],
    columnStyles: {
      0: { cellWidth: 100, overflow: 'linebreak' },
      1: { cellWidth: 40, overflow: 'linebreak' },
      2: { cellWidth: 30, overflow: 'linebreak' },
      3: { cellWidth: 100, overflow: 'linebreak' },
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => {
      yPos = data.cursor.y + 10;
      addHeader();
    },
  });

  // Admin-only sections
  if (isAdmin) {
    // All Questions (Admin Only)
    doc.addPage();
    yPos = 30;
    doc.text("All Questions (Admin View)", 10, yPos);
    yPos += 5;
    const allQuestions = [
      ...finishedQuestions.map(q => ({ ...q, status: 'Finished' })),
      ...(activeQuestion ? [{ ...activeQuestion, status: 'Active' }] : []),
      ...questions.map(q => ({ ...q, status: 'Pending' })),
    ];
    const allQuestionsTableData = allQuestions.flatMap(q => {
      const repliesData = (replies[q.id] || []).map(r => ['', '', '', '', `${r.text} (${r.author}${r.is_pinned ? ', Starred' : ''})`]);
      return [
        [q.status, q.text, q.author, q.votes, repliesData.length > 0 ? repliesData[0][4] : ''],
        ...repliesData.slice(1),
      ];
    });
    autoTable(doc, {
      startY: yPos,
      head: [['Status', 'Question', 'Author', 'Votes', 'Replies']],
      body: allQuestionsTableData.length ? allQuestionsTableData : [['No questions yet', '', '', '', '']],
      columnStyles: {
        0: { cellWidth: 20, overflow: 'linebreak' },
        1: { cellWidth: 90, overflow: 'linebreak' },
        2: { cellWidth: 40, overflow: 'linebreak' },
        3: { cellWidth: 30, overflow: 'linebreak' },
        4: { cellWidth: 90, overflow: 'linebreak' },
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        yPos = data.cursor.y + 10;
        addHeader();
      },
    });

    // Participants (Admin Only)
    doc.addPage();
    yPos = 30;
    doc.text("Participants (Admin View)", 10, yPos);
    yPos += 5;
    const participantData = participants.map(p => {
      const qAsked = allQuestions.filter(q => q.author === p.name).length;
      const commentsOnOwn = Object.values(replies).flat().filter(r => allQuestions.some(q => q.id === r.question_id && q.author === p.name)).length;
      const commentsLeft = Object.values(replies).flat().filter(r => r.author === p.name).length;
      const hasStarred = Object.values(replies).flat().some(r => r.author === p.name && r.is_pinned);
      return [
        p.name,
        p.isAdmin ? 'Admin' : p.isModerator ? 'Moderator' : 'User',
        p.votes,
        qAsked,
        commentsOnOwn,
        commentsLeft,
        hasStarred ? 'Yes' : 'No',
      ];
    });
    autoTable(doc, {
      startY: yPos,
      head: [['Name', 'Role', 'Votes Left', 'Questions Asked', 'Comments on Own Qs', 'Comments Left', 'Has Starred Comment']],
      body: participantData,
      columnStyles: {
        0: { cellWidth: 45, overflow: 'linebreak' },
        1: { cellWidth: 25, overflow: 'linebreak' },
        2: { cellWidth: 20, overflow: 'linebreak' },
        3: { cellWidth: 35, overflow: 'linebreak' },
        4: { cellWidth: 35, overflow: 'linebreak' },
        5: { cellWidth: 35, overflow: 'linebreak' },
        6: { cellWidth: 35, overflow: 'linebreak' },
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        addHeader();
      },
    });
  }

  doc.save(`QA_Session_${sessionCode}_Report.pdf`);
};