var remote = require('remote')
var fs = require('fs')
var shell = require('shell')
var sgf = require('../module/sgf')
var gametree = require('../module/gametree')
var uuid = require('../lib/node-uuid')
var process = remote.require('process')
var app = remote.require('app')
var dialog = remote.require('dialog')
var dns = remote.require('dns')
var https = remote.require('https')
var setting = remote.require('./module/setting')

var Tuple = require('../lib/tuple')
var Board = require('../module/board')
var Scrollbar = require('../lib/gemini-scrollbar')
var Menu = remote.require('menu')

/**
 * Getter & setter
 */

function getRootTree() {
    if (!getCurrentTreePosition()) return null

    return getCurrentTreePosition().unpack(function(tree, index) {
        while (tree.parent != null) tree = tree.parent
        return tree
    })
}

function setRootTree(tree) {
    if (tree.nodes.length == 0) return

    tree.parent = null
    setCurrentTreePosition(sgf.addBoard(tree), 0)

    // Update UI
    if (getShowSidebar()) {
        updateGraph()
        updateSlider()
    }

    if ('PB' in tree.nodes[0]) setPlayerName(1, tree.nodes[0].PB[0])
    if ('PW' in tree.nodes[0]) setPlayerName(-1, tree.nodes[0].PW[0])
}

function getGraphMatrixDict() {
    return $('graph').retrieve('graphmatrixdict')
}

function setGraphMatrixDict(matrixdict) {
    if (!getShowSidebar()) return

    var s = $('graph').retrieve('sigma')
    s.graph.clear()

    try {
        s.graph.read(gametree.matrixdict2graph(matrixdict))
        s.refresh()
    } catch(e) {
        setGraphMatrixDict(matrixdict)
    }

    $('graph').store('graphmatrixdict', matrixdict)
}

function setCurrentTreePosition(tree, index) {
    if (!tree || getScoringMode()) return

    // Remove old graph node color
    var oldNode = getCurrentGraphNode()
    var oldPos = getCurrentTreePosition()
    var node = getGraphNode(tree, index)

    if (oldNode && oldNode != node)
        oldNode.color = oldNode.originalColor

    // Store new position
    $('goban').store('position', new Tuple(tree, index))
    var retrack = !gametree.onCurrentTrack(tree)

    // Set current path
    var t = tree
    while (t.parent) {
        t.parent.current = t.parent.subtrees.indexOf(t)
        t = t.parent
    }

    // Update graph and slider
    setTimeout(function() {
        if (!new Tuple(tree, index).equals(getCurrentTreePosition())) return

        var redraw = !node || retrack || tree.collapsed && index == tree.nodes.length - 1
        var t = tree

        while (t.parent && t.parent.collapsed) {
            redraw = true
            t.parent.collapsed = false
            t = t.parent
        }

        if (redraw) {
            tree.collapsed = false
            updateGraph()
        }

        centerGraphCameraAt(getCurrentGraphNode())
        updateSlider()
    }, setting.get('graph.delay'))

    setBoard(sgf.addBoard(tree, index).nodes[index].board)

    // Determine current player
    setCurrentPlayer(1)

    if ('B' in tree.nodes[index]) setCurrentPlayer(-1)
    else if ('W' in tree.nodes[index]) setCurrentPlayer(1)
    else if ('PL' in tree.nodes[index])
        setCurrentPlayer(tree.nodes[index].PL[0] == 'W' ? -1 : 1)
    else if ('HA' in tree.nodes[index] && tree.nodes[index].HA[0].toInt() >= 1)
        setCurrentPlayer(-1)
}

function getCurrentTreePosition() {
    return $('goban').retrieve('position')
}

function getCurrentGraphNode() {
    if (!getCurrentTreePosition()) return null
    return getCurrentTreePosition().unpack(getGraphNode)
}

function getGraphNode(tree, index) {
    var id = typeof tree === 'object' ? tree.id + '-' + index : tree
    var s = $('graph').retrieve('sigma')
    return s.graph.nodes(id)
}

function getSelectedTool() {
    var li = $$('#edit .selected')[0]
    var tool = li.get('class').replace('selected', '').replace('-tool', '').trim()

    if (tool == 'stone') {
        return li.getElement('img').get('src').contains('_1') ? 'stone_1' : 'stone_-1'
    } else {
        return tool
    }
}

function setSelectedTool(tool) {
    if (!getEditMode()) {
        setEditMode(true)
        if (getSelectedTool().contains(tool)) return
    }

    $$('#edit .' + tool + '-tool a').fireEvent('click')
}

function getBoard() {
    return $('goban').retrieve('board')
}

function setBoard(board) {
    if (!getBoard() || getBoard().size != board.size) {
        $('goban').store('board', board)
        buildBoard()
    }

    $('goban').store('board', board)
    setCaptures(board.captures)

    for (var x = 0; x < board.size; x++) {
        for (var y = 0; y < board.size; y++) {
            var li = $('goban').getElement('.pos_' + x + '-' + y)
            var sign = board.arrangement[li.retrieve('tuple')]
            var types = ['ghost_1', 'ghost_-1', 'circle', 'triangle',
                'cross', 'square', 'label', 'point']

            types.each(function(x) {
                if (li.hasClass(x)) li.removeClass(x)
            })
            li.set('title', '')

            if (li.retrieve('tuple') in board.overlays) {
                board.overlays[li.retrieve('tuple')].unpack(function(type, ghost, label) {
                    if (type != '') li.addClass(type)
                    if (ghost != 0) li.addClass('ghost_' + ghost)
                    if (label != '') li.set('title', label)
                })
            }

            if (li.hasClass('sign_' + sign)) continue

            for (var i = -1; i <= 1; i++) {
                if (li.hasClass('sign_' + i)) li.removeClass('sign_' + i)
            }

            li.addClass('sign_' + sign)
                .getElement('img').set('src', '../img/goban/stone_' + sign + '.png')
        }
    }
}

function getScoringMethod() {
    return $$('#score .method .territory')[0].hasClass('current') ? 'territory' : 'area'
}

function setScoringMethod(method) {
    $$('#score .method li').removeClass('current')
    $$('#score .method .' + method).addClass('current')
    $$('#score tr > *').addClass('disabled')
    $$('#score table .' + method).removeClass('disabled')

    setting.set('scoring.method', method)

    // Update UI
    for (var sign = -1; sign <= 1; sign += 2) {
        var tr = $$('#score tbody tr' + (sign < 0 ? ':last-child' : ''))[0]
        var tds = tr.getElements('td')

        tds[4].set('text', 0)

        for (var i = 0; i <= 3; i++) {
            if (tds[i].hasClass('disabled') || isNaN(tds[i].get('text').toFloat())) continue
            tds[4].set('text', tds[4].get('text').toFloat() + tds[i].get('text').toFloat())
        }
    }
}

/**
 * Methods
 */

function loadSettings() {
    if (setting.get('view.fuzzy_stone_placement'))
        $('goban').addClass('fuzzy')
    if (setting.get('view.show_coordinates'))
        $('goban').addClass('coordinates')
    if (setting.get('view.show_variations'))
        $('goban').addClass('variations')
    if (setting.get('view.show_sidebar')) {
        document.body.addClass('sidebar')
        setSidebarWidth(setting.get('view.sidebar_width'))
    }
}

function prepareEditTools() {
    $$('#edit ul a').addEvent('click', function() {
        if (!this.getParent().hasClass('selected')) {
            $$('#edit .selected').removeClass('selected')
            this.getParent().addClass('selected')
        } else if (this.getParent().hasClass('stone-tool')) {
            var img = this.getElement('img')
            var black = img.get('src') == '../img/edit/stone_1.png'
            img.set('src', black ? '../img/edit/stone_-1.png' : '../img/edit/stone_1.png')
        }
    })
}

function prepareGameGraph() {
    var container = $('graph')
    var s = new sigma(container)

    s.settings({
        defaultNodeColor: setting.get('graph.node_inactive_color'),
        defaultEdgeColor: setting.get('graph.node_color'),
        defaultNodeBorderColor: 'rgba(255,255,255,.2)',
        edgeColor: 'default',
        borderSize: 2,
        zoomMax: 1,
        zoomMin: 1,
        autoResize: false,
        autoRescale: false
    })

    s.bind('clickNode', function(e) {
        e.data.node.data.unpack(function(tree, index) {
            setCurrentTreePosition(tree, index)
        })
    }).bind('rightClickNode', function(e) {
        e.data.node.data.unpack(function(tree, index) {
            openNodeMenu(tree, index)
        })
    })

    container.store('sigma', s)
}

function prepareSlider() {
    var slider = $$('#sidebar .slider')[0]

    slider.addEvent('mousedown', function() {
        if (event.buttons != 1) return

        this.store('mousedown', true).addClass('active')
        document.fireEvent('mousemove')
    })

    document.addEvent('mouseup', function() {
        slider.store('mousedown', false)
            .removeClass('active')
    }).addEvent('mousemove', function() {
        if (event.buttons != 1 || !slider.retrieve('mousedown'))
            return

        var percentage = event.clientY / slider.getSize().y
        var height = Math.round((gametree.getCurrentHeight(getRootTree()) - 1) * percentage)
        var pos = gametree.navigate(getRootTree(), 0, height)

        if (pos.equals(getCurrentTreePosition())) return
        pos.unpack(setCurrentTreePosition)
        updateSlider()
    })
}

function prepareDragDropFiles() {
    Element.NativeEvents.dragover = 2
    Element.NativeEvents.drop = 2

    document.body.addEvent('dragover', function() {
        return false
    }).addEvent('drop', function(e) {
        e.preventDefault()

        if (e.event.dataTransfer.files.length == 0) return
        loadGame(e.event.dataTransfer.files[0].path)
    })
}

function checkForUpdates(callback) {
    if (!callback) callback = function(hasUpdates) {}
    var url = 'https://github.com/yishn/' + app.getName() + '/releases/latest'

    // Check internet connection first
    dns.lookup('github.com', function(err) {
        if (err) return

        https.get(url, function(response) {
            response.on('data', function(chunk) {
                chunk = '' + chunk
                var hasUpdates = !chunk.contains('v' + app.getVersion())

                if (hasUpdates && dialog.showMessageBox(remote.getCurrentWindow(), {
                    type: 'info',
                    buttons: ['Download Update', 'Not Now'],
                    title: app.getName(),
                    message: 'There is a new version of ' + app.getName() + ' available.',
                    cancelId: 1,
                    noLink: true
                }) == 0) shell.openExternal(url)

                callback(hasUpdates)
            })
        }).on('error', function(e) {})
    })
}

function makeMove(vertex) {
    if (getBoard().hasVertex(vertex) && getBoard().arrangement[vertex] != 0)
        return

    var position = getCurrentTreePosition()
    var tree = position[0], index = position[1]
    var color = getCurrentPlayer() > 0 ? 'B' : 'W'
    var sign = color == 'B' ? 1 : -1

    if (getBoard().hasVertex(vertex)) {
        // Check for ko
        if (setting.get('game.show_ko_warning')) {
            var ko = gametree.navigate(tree, index, -1).unpack(function(prevTree, prevIndex) {
                if (!prevTree) return

                var hash = getBoard().makeMove(sign, vertex).getHash()
                return prevTree.nodes[prevIndex].board.getHash() == hash
            })

            if (ko && dialog.showMessageBox(remote.getCurrentWindow(), {
                type: 'info',
                title: app.getName(),
                buttons: ['Play Anyway', 'Don’t Play'],
                message: [
                    'You are about to play a move which repeats a previous board position.',
                    'This is invalid in some rulesets.'
                ].join(' '),
                cancelId: 1,
                noLink: true
            }) != 0) return
        }

        // Check for suicide
        var capture = getBoard().getNeighborhood(vertex).some(function(v) {
            return getBoard().arrangement[v] == -sign && getBoard().getLiberties(v).length == 1
        })

        var suicide = setting.get('game.show_suicide_warning')
        suicide = suicide && !capture && getBoard().getNeighborhood(vertex).filter(function(v) {
            return getBoard().arrangement[v] == sign
        }).every(function(v) {
            return getBoard().getLiberties(v).length == 1
        }) && getBoard().getNeighborhood(vertex).filter(function(v) {
            return getBoard().arrangement[v] == 0
        }).length == 0

        if (suicide) {
            if (dialog.showMessageBox(remote.getCurrentWindow(), {
                type: 'info',
                title: app.getName(),
                buttons: ['Play Anyway', 'Don’t Play'],
                message: [
                    'You are about to play a suicide move.',
                    'This is invalid in some rulesets.'
                ].join(' '),
                cancelId: 1,
                noLink: true
            }) != 0) return
        }

        // Randomize shift and readjust
        var li = $$('#goban .pos_' + vertex[0] + '-' + vertex[1])
        var direction = Math.floor(Math.random() * 9)

        for (var i = 0; i < 9; i++) li.removeClass('shift_' + i)
        li.addClass('shift_' + direction)

        if (direction == 1 || direction == 5 || direction == 8) {
            // Left
            $$('#goban .pos_' + (vertex[0] - 1) + '-' + vertex[1])
                .removeClass('shift_3').removeClass('shift_7').removeClass('shift_6')
        } else if (direction == 2 || direction == 5 || direction == 6) {
            // Top
            $$('#goban .pos_' + vertex[0] + '-' + (vertex[1] - 1))
                .removeClass('shift_4').removeClass('shift_7').removeClass('shift_8')
        } else if (direction == 3 || direction == 7 || direction == 6) {
            // Right
            $$('#goban .pos_' + (vertex[0] + 1) + '-' + vertex[1])
                .removeClass('shift_1').removeClass('shift_5').removeClass('shift_8')
        } else if (direction == 4 || direction == 7 || direction == 8) {
            // Bottom
            $$('#goban .pos_' + vertex[0] + '-' + (vertex[1] + 1))
                .removeClass('shift_2').removeClass('shift_5').removeClass('shift_6')
        }

        // Play sounds
        if (capture || suicide) setTimeout(function() {
            new Audio('../sound/capture' + Math.floor(Math.random() * 5) + '.wav').play()
        }, 300 + Math.floor(Math.random() * 200))

        new Audio('../sound/' + Math.floor(Math.random() * 5) + '.wav').play()
    } else new Audio('../sound/pass.wav').play()


    if (tree.current == null && tree.nodes.length - 1 == index) {
        // Append move
        var node = {}
        node[color] = [sgf.vertex2point(vertex)]
        tree.nodes.push(node)

        setCurrentTreePosition(tree, tree.nodes.length - 1)
    } else {
        if (index != tree.nodes.length - 1) {
            // Search for next move
            var nextNode = tree.nodes[index + 1]
            var moveExists = color in nextNode
                && sgf.point2vertex(nextNode[color][0]).equals(vertex)

            if (moveExists) {
                setCurrentTreePosition(tree, index + 1)
                return
            }
        } else {
            // Search for variation
            var variations = tree.subtrees.filter(function(subtree) {
                return subtree.nodes.length > 0
                    && color in subtree.nodes[0]
                    && sgf.point2vertex(subtree.nodes[0][color][0]).equals(vertex)
            })

            if (variations.length > 0) {
                setCurrentTreePosition(sgf.addBoard(variations[0]), 0)
                return
            }
        }

        // Create variation
        var splitted = gametree.splitTree(tree, index)
        var node = {}; node[color] = [sgf.vertex2point(vertex)]
        var newtree = gametree.new()
        newtree.nodes = [node]
        newtree.parent = splitted

        splitted.subtrees.push(newtree)
        splitted.current = splitted.subtrees.length - 1

        sgf.addBoard(newtree, newtree.nodes.length - 1)
        setCurrentTreePosition(newtree, 0)
    }
}

function vertexClicked() {
    closeGameInfo()

    if (!getEditMode() && !getScoringMode()) {
        if (event.button != 0) return
        makeMove(this)

        return
    }

    // Scoring mode activated
    if (getScoringMode()) {
        if (getBoard().arrangement[this] == 0) return

        getBoard().getRelatedChains(this).each(function(vertex) {
            $$('#goban .pos_' + vertex[0] + '-' + vertex[1]).toggleClass('dead')
        })

        updateAreaMap()
        return
    }

    // Edit mode activated
    getCurrentTreePosition().unpack(function(tree, index) {
        var node = tree.nodes[index]
        var tool = getSelectedTool()
        var board = getBoard()
        var dictionary = {
            'cross': 'MA',
            'triangle': 'TR',
            'circle': 'CR',
            'square': 'SQ',
            'number': 'LB',
            'label': 'LB'
        }

        if (tool.contains('stone')) {
            if ('B' in node || 'W' in node) {
                // New variation needed
                var splitted = gametree.splitTree(tree, index)

                if (splitted != tree || splitted.subtrees.length != 0) {
                    tree = gametree.new()
                    tree.parent = splitted
                    splitted.subtrees.push(tree)
                }

                node = { PL: getCurrentPlayer() > 0 ? ['B'] : ['W'] }
                index = tree.nodes.length
                tree.nodes.push(node)

                updateGraph()
                updateSlider()
            }

            var sign = tool.contains('_1') ? 1 : -1
            if (event.button == 2) sign = -sign

            var oldSign = board.arrangement[this]
            var ids = ['AW', 'AE', 'AB']
            var id = ids[sign + 1]
            var point = sgf.vertex2point(this)

            for (var i = -1; i <= 1; i++) {
                if (!(ids[i + 1] in node)) continue

                k = node[ids[i + 1]].indexOf(point)
                if (k >= 0) {
                    node[ids[i + 1]].splice(k, 1)

                    if (node[ids[i + 1]].length == 0) {
                        delete node[ids[i + 1]]
                    }
                }
            }

            if (oldSign != sign) {
                if (id in node) node[id].push(point)
                else node[id] = [point]
            } else if (oldSign == sign) {
                if ('AE' in node) node.AE.push(point)
                else node.AE = [point]
            }
        } else {
            if (event.button != 0) return

            if (tool != 'label' && tool != 'number') {
                if (this in board.overlays && board.overlays[this][0] == tool) {
                    delete board.overlays[this]
                } else {
                    board.overlays[this] = new Tuple(tool, 0, '')
                }
            } else if (tool == 'number') {
                if (this in board.overlays && board.overlays[this][0] == 'label') {
                    delete board.overlays[this]
                } else {
                    var number = 1

                    if ('LB' in node) {
                        node.LB.each(function(value) {
                            var label = value.substr(3).toInt()
                            if (!isNaN(label)) number = Math.max(number, label + 1)
                        })
                    }

                    board.overlays[this] = new Tuple(tool, 0, number.toString())
                }
            } else if (tool == 'label') {
                if (this in board.overlays && board.overlays[this][0] == 'label') {
                    delete board.overlays[this]
                } else {
                    var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                    var k = 0

                    if ('LB' in node) {
                        node.LB.each(function(value) {
                            if (value.length != 4 || !alpha.contains(value[3])) return

                            var label = value[3]
                            k = Math.max(k, (alpha.indexOf(label) + 1) % alpha.length)
                        })
                    }

                    board.overlays[this] = new Tuple(tool, 0, alpha[k])
                }
            }

            Object.each(dictionary, function(id) { delete node[id] })

            $$('#goban .row li').each(function(li) {
                var vertex = li.retrieve('tuple')
                if (!(vertex in board.overlays)) return

                var id = dictionary[board.overlays[vertex][0]]
                var pt = sgf.vertex2point(vertex)
                if (id == 'LB') pt += ':' + board.overlays[vertex][2]

                if (id in node) node[id].push(pt)
                else node[id] = [pt]
            })
        }

        setCurrentTreePosition(tree, index)
    }.bind(this))
}

function updateGraph() {
    if (!getShowSidebar() || !getCurrentTreePosition()) return

    setGraphMatrixDict(gametree.tree2matrixdict(getRootTree()))
    centerGraphCameraAt(getCurrentGraphNode())
}

function updateSlider() {
    if (!getShowSidebar()) return

    getCurrentTreePosition().unpack(function(tree, index) {
        var total = gametree.getCurrentHeight(getRootTree()) - 1
        var relative = total + 1 - gametree.getCurrentHeight(tree) + index

        setSliderValue(total == 0 ? 0 : relative * 100 / total, relative)
    })
}

function updateGameInfo() {
    var rootNode = getRootTree().nodes[0]
    var info = $('info')

    rootNode.BR = [info.getElement('input[name="rank_1"]').get('value').trim()]
    rootNode.WR = [info.getElement('input[name="rank_-1"]').get('value').trim()]
    rootNode.PB = [info.getElement('input[name="name_1"]').get('value').trim()]
    rootNode.PW = [info.getElement('input[name="name_-1"]').get('value').trim()]

    setPlayerName(1, rootNode.PB[0])
    setPlayerName(-1, rootNode.PW[0])

    var result = info.getElement('input[name="result"]').get('value').trim()
    rootNode.RE = [result]
    if (result == '') delete rootNode.RE

    var komi = info.getElement('input[name="komi"]').get('value').toFloat()
    rootNode.KM = [String.from(komi)]
    if (isNaN(komi)) rootNode.KM = ['0']

    var handicap = info.getElement('select[name="handicap"]').selectedIndex
    if (handicap == 0) delete rootNode.HA
    else rootNode.HA = [String.from(handicap + 1)]

    var size = info.getElement('input[name="size"]').get('value').toInt()
    rootNode.SZ = [String.from(Math.max(Math.min(size, 26), 9))]
    if (isNaN(size)) rootNode.SZ = ['' + setting.get('game.default_board_size')]

    if (!info.getElement('select[name="handicap"]').disabled) {
        setCurrentTreePosition(getRootTree(), 0)

        if (!('HA' in rootNode)) {
            delete rootNode.AB
        } else {
            var board = getBoard()
            var stones = board.getHandicapPlacement(rootNode.HA[0].toInt())
            rootNode.AB = []

            for (var i = 0; i < stones.length; i++) {
                rootNode.AB.push(sgf.vertex2point(stones[i]))
            }
        }

        setCurrentTreePosition(getRootTree(), 0)
    }
}

function updateScore() {
    var rootNode = getRootTree().nodes[0]
    var results = $$('#score tbody td:last-child').get('text')
    var diff = results[0].toFloat() - results[1].toFloat()
    var result = diff > 0 ? 'B+' : (diff < 0 ? 'W+' : 'Draw')
    if (diff != 0) result = result + Math.abs(diff)

    rootNode.RE = [result]
}

function updateAreaMap() {
    var board = getBoard().makeMove(0)

    $$('#goban .row li.dead').each(function(li) {
        if (li.hasClass('sign_1')) board.captures['-1']++
        else if (li.hasClass('sign_-1')) board.captures['1']++

        board.arrangement[li.retrieve('tuple')] = 0
    })

    var map = board.getAreaMap()

    $$('#goban .row li').each(function(li) {
        li.removeClass('area_-1').removeClass('area_0').removeClass('area_1')
            .addClass('area_' + map[li.retrieve('tuple')])
        if (!li.getElement('div.area'))
            li.grab(new Element('div', { class: 'area' }))
    })

    $('goban').store('areamap', map)
        .store('finalboard', board)
}

function centerGraphCameraAt(node) {
    if (!getShowSidebar() || !node) return

    var s = $('graph').retrieve('sigma')
    s.renderers[0].resize().render()

    var matrixdict = getGraphMatrixDict()
    var y = matrixdict[1][node.id][1]

    gametree.getWidth(y, matrixdict[0]).unpack(function(width, padding) {
        var x = matrixdict[1][node.id][0] - padding
        var relX = width == 1 ? 0 : x / (width - 1)
        var diff = (width - 1) * setting.get('graph.grid_size') / 2
        diff = Math.min(diff, s.renderers[0].width / 2 - setting.get('graph.grid_size'))

        node.color = setting.get('graph.node_active_color')
        s.refresh()

        sigma.misc.animation.camera(
            s.camera,
            {
                x: node[s.camera.readPrefix + 'x'] + (1 - 2 * relX) * diff,
                y: node[s.camera.readPrefix + 'y']
            },
            { duration: setting.get('graph.delay') }
        )
    })
}

/**
 * Menu
 */

function newGame(playSound) {
    var buffer = ';GM[1]AP[' + app.getName() + ':' + app.getVersion() + ']'
    buffer += 'CA[UTF-8]PB[Black]PW[White]KM[' + setting.get('game.default_komi')
        + ']SZ[' + setting.get('game.default_board_size') + ']'

    var tree = sgf.parse(sgf.tokenize(buffer))
    setRootTree(tree)

    if (arguments.length >= 1 && playSound) {
        new Audio('../sound/newgame.wav').play()
        showGameInfo()
    }

    closeScore()
}

function loadGame(filename) {
    setIsLoading(true)

    if (!filename) {
        var result = dialog.showOpenDialog(remote.getCurrentWindow(), {
            filters: [sgf.meta, { name: 'All Files', extensions: ['*'] }]
        })

        if (result) filename = result[0]
    }

    try {
        if (filename) {
            var win = remote.getCurrentWindow()
            var tree = sgf.parseFile(filename, win.setProgressBar)

            if (tree.subtrees.length != 0) tree = tree.subtrees[0]
            setRootTree(tree)
            win.setProgressBar(0)
        }
    } catch(e) {
        dialog.showMessageBox(remote.getCurrentWindow(), {
            type: 'warning',
            buttons: ['OK'],
            title: app.getName(),
            message: 'This file is unreadable.'
        })
    }

    setIsLoading(false)
    closeGameInfo()
    closeScore()
}

function saveGame() {
    setIsLoading(true)

    var result = dialog.showSaveDialog(remote.getCurrentWindow(), {
        filters: [sgf.meta, { name: 'All Files', extensions: ['*'] }]
    })

    if (result) {
        var tree = getRootTree()
        var text = '(' + sgf.tree2string(tree) + ')'

        fs.writeFile(result, text)
    }

    setIsLoading(false)
}

function goBack() {
    getCurrentTreePosition().unpack(function(tree, position) {
        gametree.navigate(tree, position, -1).unpack(function(prevTree, prevIndex) {
            setCurrentTreePosition(prevTree, prevIndex)
        })
    })
}

function goForward() {
    getCurrentTreePosition().unpack(function(tree, position) {
        gametree.navigate(tree, position, 1).unpack(function(nextTree, nextIndex) {
            setCurrentTreePosition(nextTree, nextIndex)
        })
    })
}

function goToNextFork() {
    getCurrentTreePosition().unpack(function(tree, index) {
        if (index != tree.nodes.length - 1)
            setCurrentTreePosition(tree, tree.nodes.length - 1)
        else if (tree.current != null) {
            var subtree = tree.subtrees[tree.current]
            setCurrentTreePosition(subtree, subtree.nodes.length - 1)
        }
    })
}

function goToPreviousFork() {
    getCurrentTreePosition().unpack(function(tree, index) {
        if (tree.parent == null || tree.parent.nodes.length == 0)
            setCurrentTreePosition(tree, 0)
        else setCurrentTreePosition(tree.parent, tree.parent.nodes.length - 1)
    })
}

function goToBeginning() {
    var tree = getRootTree()
    if (tree.nodes.length == 0) return
    setCurrentTreePosition(tree, 0)
}

function goToEnd() {
    getCurrentTreePosition().unpack(function(tree, position) {
        var t = tree
        while (t.current != null) {
            t = t.subtrees[t.current]
        }
        setCurrentTreePosition(t, t.nodes.length - 1)
    })
}

function goToNextVariation() {
    getCurrentTreePosition().unpack(function(tree, index) {
        if (!tree.parent) return

        var mod = tree.parent.subtrees.length
        tree.parent.current = (tree.parent.current + 1) % mod
        setCurrentTreePosition(tree.parent.subtrees[tree.parent.current], 0)
    })
}

function goToPreviousVariation() {
    getCurrentTreePosition().unpack(function(tree, index) {
        if (!tree.parent) return

        var mod = tree.parent.subtrees.length
        tree.parent.current = (tree.parent.current + mod - 1) % mod
        setCurrentTreePosition(tree.parent.subtrees[tree.parent.current], 0)
    })
}

function removeNode(tree, index) {
    if (!tree.parent && index == 0) {
        dialog.showMessageBox(remote.getCurrentWindow(), {
            type: 'warning',
            title: app.getName(),
            buttons: ['OK'],
            message: 'The root node cannot be removed.'
        })

        return
    }

    var prev = gametree.navigate(tree, index, -1)

    if (index != 0) {
        tree.nodes.splice(index, tree.nodes.length)
        tree.current = null
        tree.subtrees.length = 0
    } else {
        var parent = tree.parent
        var i = parent.subtrees.indexOf(tree)

        parent.subtrees.splice(i, 1)
        if (parent.current >= i) parent.current--
        gametree.reduceTree(parent)
    }

    setGraphMatrixDict(gametree.tree2matrixdict(getRootTree()))
    if (getCurrentGraphNode()) prev = getCurrentTreePosition()
    setCurrentTreePosition(prev[0], prev[1])
}

/**
 * Main events
 */

document.addEvent('keydown', function(e) {
    if (e.code == 123) {
        // F12
        remote.getCurrentWindow().toggleDevTools()
    } else if (e.code == 116) {
        // F5
        location.reload()
    } else if (e.code == 27) {
        // Escape key
        closeGameInfo()
        closeScore()
        setEditMode(false)
    }
}).addEvent('domready', function() {
    loadSettings()
    prepareDragDropFiles()
    prepareEditTools()
    prepareGameGraph()
    prepareSlider()

    if (process.argv.length >= 2) loadGame(process.argv[1])
    else newGame()
})

window.addEvent('load', function() {
    if (setting.get('app.startup_check_updates')) {
        setTimeout(function() {
            checkForUpdates()
        }, setting.get('app.startup_check_updates_delay'))
    }
}).addEvent('resize', function() {
    resizeBoard()
}).addEvent('beforeunload', function() {
    if (remote.getCurrentWindow().isMaximized() || remote.getCurrentWindow().isMinimized()) return

    var size = document.body.getSize()
    setting.set('window.width', size.x).set('window.height', size.y)
})
