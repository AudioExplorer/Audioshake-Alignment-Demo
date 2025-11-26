import Foundation

actor AudioShakeClient {
    private let apiKey = "${api_key}"
    private let baseURL = "https://api.audioshake.ai"
    
    struct TaskResponse: Decodable {
        let id: String
        let status: String?
        let targets: [Target]?
        
        struct Target: Decodable {
            let status: String
            let output: [Output]
            
            struct Output: Decodable {
                let link: String
            }
        }
    }
    
    func align(videoURL: String) async throws -> String {
        let taskID = try await createTask(videoURL: videoURL)
        print("Task created: \\(taskID)")
        
        while true {
            let response = try await getStatus(taskID: taskID)
            
            guard let targets = response.targets else {
                throw AudioShakeError.noResult
            }
            
            let allComplete = targets.allSatisfy { $0.status == "completed" }
            let anyFailed = targets.contains { $0.status == "failed" || $0.status == "error" }
            
            if anyFailed {
                throw AudioShakeError.taskFailed
            }
            
            if allComplete {
                guard let resultURL = targets.first?.output.first?.link else {
                    throw AudioShakeError.noResult
                }
                return resultURL
            }
            
            print("Status: processing...")
            try await Task.sleep(for: .seconds(5))
        }
    }
    
    private func createTask(videoURL: String) async throws -> String {
        let body: [String: Any] = [
            "url": videoURL,
            "targets": [[
                "model": "alignment",
                "formats": ["json"],
                "language": "en"
            ]]
        ]
        
        var request = URLRequest(url: URL(string: "\\(baseURL)/tasks")!)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(TaskResponse.self, from: data)
        return response.id
    }
    
    private func getStatus(taskID: String) async throws -> TaskResponse {
        var request = URLRequest(url: URL(string: "\\(baseURL)/tasks/\\(taskID)")!)
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(TaskResponse.self, from: data)
    }
    
    enum AudioShakeError: Error {
        case taskFailed, noResult
    }
}

Task {
    do {
        let client = AudioShakeClient()
        let resultURL = try await client.align(videoURL: "${source_url}")
        print("✅ Result: \\(resultURL)")
    } catch let error as URLError {
        print("❌ Network Error: \\(error.localizedDescription)")
    } catch let error as DecodingError {
        print("❌ Decoding Error: \\(error)")
    } catch let error as AudioShakeClient.AudioShakeError {
        print("❌ AudioShake Error: \\(error)")
    } catch {
        print("❌ Error: \\(error.localizedDescription)")
        print("Full error: \\(error)")
    }
}

import PlaygroundSupport
PlaygroundPage.current.needsIndefiniteExecution = true