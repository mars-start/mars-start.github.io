import CodeMirror from 'codemirror';
import 'codemirror/mode/sql/sql';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import NodeSQLParser  from 'node-sql-parser';

function saveConfig(json) {
    localStorage.setItem('config', JSON.stringify(json));
    showContent();
}

function showForm() {
    document.getElementById('configForm').style.display = 'block';
    document.getElementById('content').style.display = 'none';
}

document.getElementById('form').addEventListener('submit', function(event) {
    event.preventDefault();

    const newConfig = document.getElementById('config').value;
     if (newConfig) {
         saveConfig(JSON.parse(newConfig));
     } else {
         alert('newConfig is empty');
     }
});

function showContent(config) {
    document.getElementById('configForm').style.display = 'none';
    document.getElementById('content').style.display = 'block';


    const sqlTemplateEl = document.getElementById("sqlTemplate");

    const editor = CodeMirror.fromTextArea(sqlTemplateEl, {
        mode: "text/x-sql",
        theme: "dracula",
        autoRefresh: true,
        firstLineNumber: 1,
        lineNumbers: true,
        smartIndent: true,
        lineWrapping: true,
        indentWithTabs: true,
        refresh: true,

    });
    editor.setSize(500, 700);
    document.getElementById('dbSelector').addEventListener('change', function () {
        const selectedDb = this.value;
        const checkboxContainer = document.getElementById('checkboxContainer');
        checkboxContainer.innerHTML = ''; // Clear existing checkboxes

        if (selectedDb === 'crm') {
            //one Db for crm
            appendCheckbox('casinosupport', checkboxContainer);
        } else {
            config.forEach(item => {
                appendCheckbox(item[selectedDb], checkboxContainer);
            });
        }

        refreshValue();
    });

    function appendCheckbox(name, checkboxContainer) {
        if (name) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = name;
            checkbox.name = name;
            checkbox.checked = true; // Default to checked

            const label = document.createElement('label');
            label.htmlFor = name;
            label.appendChild(document.createTextNode(name));

            const div = document.createElement('div');
            div.appendChild(checkbox);
            div.appendChild(label);
            checkbox.addEventListener('change', function () {
                refreshValue();
            });
            checkboxContainer.appendChild(div);
        }
    }
// Select all checkboxes
    document.getElementById('selectAllButton').addEventListener('click', function () {
        const checkboxes = document.querySelectorAll('#checkboxContainer input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        refreshValue();
    });

// Deselect all checkboxes
    document.getElementById('deselectAllButton').addEventListener('click', function () {
        const checkboxes = document.querySelectorAll('#checkboxContainer input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        refreshValue();
    });
    const queriesContainer = document.getElementById('queriesContainer');
    const output = CodeMirror.fromTextArea(queriesContainer, {
        mode: "text/x-sql",
        theme: "dracula",
        autoRefresh: true,
        firstLineNumber: 1,
        lineNumbers: true,
        smartIndent: true,
        lineWrapping: true,
        indentWithTabs: true,
        refresh: true
    });
    output.setSize(500, 700);

    editor.on("change", function() {
        sqlTemplateEl.innerText = editor.getValue();
        refreshValue();
    });

    function refreshValue() {
        const selectedDb = document.getElementById('dbSelector').value;
        const sqlTemplate = editor.getValue();
        output.setValue('');
        const tablets = getAllTableNames(sqlTemplate);

        const checkboxes = document.querySelectorAll('#checkboxContainer input[type="checkbox"]:checked');
        let result = '';
        checkboxes.forEach(checkbox => {
            const replacement = tablets.map(function (p1) {
                return `\`${checkbox.name}\`` + '.' + `\`${p1}\``;
            });

            let sql = replaceTableNames(sqlTemplate, tablets, replacement);

            if (sql && sql !== "undefined" && replacement.length) {

                result += `\n -- ${selectedDb} ${checkbox.name}\n`;
                result += sql;
            }
        });
        output.setValue(result);
    }
    function replaceTableNames(sqlQuery, tableNames, replacement) {
        tableNames.sort((a, b) => b.length - a.length);
        replacement.sort((a, b) => b.length - a.length);
        console.log(tableNames, replacement);
        tableNames.forEach((tableName, index) => {
            const regex = new RegExp(`\\b${tableName}\\b`, 'gi');
            sqlQuery = sqlQuery.replace(regex, replacement[index]);
        });

        return sqlQuery;
    }

    document.getElementById('copy-code').addEventListener('click', function (e) {
        if (e.which == 1) {
            // write the text to the clipboard
            navigator.clipboard.writeText(output.getValue());
        }
    });
    function getAllTableNames(sqlQuery) {
        try {
            const parser = new NodeSQLParser.Parser()

            const tableList = parser.tableList(sqlQuery);
            const tableNames = new Set();
            for (const key in tableList) {
                tableNames.add(tableList[key].split('::')[2]);
            }

            return Array.from(tableNames);
        } catch (error) {
            console.error('Error parsing SQL:', error);
            return [];
        }
    }

// Trigger change event on page load to populate checkboxes initially
    document.getElementById('dbSelector').dispatchEvent(new Event('change'));
}

window.onload = function() {
    const savedConfig = localStorage.getItem('config');

    if (savedConfig) {
        const configData = JSON.parse(savedConfig);
        console.log('Loaded config:', configData);
        showContent(configData);
    } else {
        showForm();
    }
};
